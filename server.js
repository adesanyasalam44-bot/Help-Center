const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allows image string data

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // Pulled securely from Render settings

let db, ticketsCollection, messagesCollection;

// Initialize MongoDB Connection
MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db('hashabi_store');
    ticketsCollection = db.collection('tickets');
    messagesCollection = db.collection('messages');
    console.log('Connected smoothly to MongoDB Atlas Cloud');
  })
  .catch(err => console.error('Database connection crash:', err));

// HTTP API ENDPOINT PATHWAY ROUTER
app.post('/api/chat', async (req, res) => {
  const { action, userId } = req.body;

  try {
    if (action === "createTicket") {
      await ticketsCollection.updateOne(
        { userId: userId },
        { $set: { userId, name: req.body.name, email: req.body.email, lastUpdated: Date.now() } },
        { upsert: true }
      );
      return res.json({ success: true });
    }

    if (action === "sendMessage") {
      await messagesCollection.insertOne({
        userId,
        sender: req.body.sender,
        text: req.body.text,
        type: req.body.type,
        timestamp: req.body.timestamp,
        rawTime: req.body.rawTime
      });
      await ticketsCollection.updateOne({ userId }, { $set: { lastUpdated: Date.now() } });
      return res.json({ success: true });
    }

    if (action === "getMessages") {
      const messages = await messagesCollection.find({ userId }).sort({ rawTime: 1 }).toArray();
      return res.json({ messages });
    }

    if (action === "getAllTickets") {
      const tickets = await ticketsCollection.find({}).sort({ lastUpdated: -1 }).toArray();
      return res.json({ tickets });
    }

    if (action === "deleteTicket") {
      await messagesCollection.deleteMany({ userId });
      await ticketsCollection.deleteOne({ userId });
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Unknown action protocol executed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server blasting off smoothly on port ${PORT}`));
