import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client (Server-side)
// We use the service role key to bypass RLS since we're using passcodes for access control
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Socket.io logic for real-time collaboration
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join a specific event room
    socket.on("join-event", async (eventId: string) => {
      socket.join(eventId);
      console.log(`User ${socket.id} joined event: ${eventId}`);
      
      // Fetch the current state of the event from Supabase
      try {
        const { data, error } = await supabase
          .from("events")
          .select("data")
          .eq("id", eventId)
          .single();

        if (data && !error) {
          socket.emit("event-update", data.data);
        } else if (error && error.code !== "PGRST116") { // PGRST116 is "No rows found"
          console.error("Supabase fetch error:", error);
        }
      } catch (err) {
        console.error("Error fetching from Supabase:", err);
      }
    });

    // Handle event updates (new expense, member change, etc.)
    socket.on("update-event", async (event: any) => {
      const eventId = event.id;
      const dataToSave = { ...event, lastUpdated: Date.now() };
      
      // 1. Persist to Supabase
      try {
        const { error } = await supabase
          .from("events")
          .upsert({ id: eventId, data: dataToSave, updated_at: new Date().toISOString() });
        
        if (error) {
          console.error("Supabase upsert error:", error);
        }
      } catch (err) {
        console.error("Error saving to Supabase:", err);
      }

      // 2. Broadcast the update to everyone in the room
      io.to(eventId).emit("event-update", dataToSave);
      console.log(`Event ${eventId} updated and saved to Supabase`);
    });

    // Handle event deletion
    socket.on("delete-event", async (eventId: string) => {
      try {
        await supabase.from("events").delete().eq("id", eventId);
        io.to(eventId).emit("event-deleted", eventId);
        console.log(`Event ${eventId} deleted from Supabase`);
      } catch (err) {
        console.error("Error deleting from Supabase:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
