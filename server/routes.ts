import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from 'crypto';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // We'll use a very simple mock auth since JWT wasn't specifically provided with secrets etc.
  // In a real production app we'd use passport or jsonwebtoken with proper secrets.
  // Here we just return a simple token for demonstration of the API structure.

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const user = await storage.createUser(input);
      const token = generateToken();
      
      res.status(201).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);
      
      if (!user || user.password !== input.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const token = generateToken();
      res.status(200).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  // Mock 'me' route returning admin by default or reading from a mock header
  app.get(api.auth.me.path, async (req, res) => {
    // A mock me endpoint that just gets the first user (for demo purposes if auth isn't fully set up)
    const users = await storage.getAllUsers();
    if (users.length > 0) {
      res.json(users[0]);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Admin Routes
  app.get(api.admin.users.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch(api.admin.approveUser.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isApproved, walletAddress } = req.body;
      const user = await storage.updateUserStatus(id, isApproved, walletAddress);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Materials
  app.get(api.materials.list.path, async (req, res) => {
    const items = await storage.getMaterials();
    res.json(items);
  });

  app.post(api.materials.create.path, async (req, res) => {
    try {
      const input = api.materials.create.input.parse(req.body);
      const item = await storage.createMaterial(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Batches
  app.get(api.batches.list.path, async (req, res) => {
    const items = await storage.getBatches();
    res.json(items);
  });

  app.get(api.batches.get.path, async (req, res) => {
    const item = await storage.getBatch(req.params.batchId);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post(api.batches.create.path, async (req, res) => {
    try {
      const input = api.batches.create.input.parse(req.body);
      const item = await storage.createBatch(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.batches.updateStatus.path, async (req, res) => {
    const { status } = req.body;
    const item = await storage.updateBatchStatus(req.params.batchId, status);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  // Transfers
  app.get(api.transfers.list.path, async (req, res) => {
    const items = await storage.getTransfers();
    res.json(items);
  });

  app.post(api.transfers.create.path, async (req, res) => {
    try {
      const input = api.transfers.create.input.parse(req.body);
      const item = await storage.createTransfer(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Authenticity
  app.get(api.authenticity.list.path, async (req, res) => {
    const items = await storage.getAuthenticityReports();
    res.json(items);
  });

  app.post(api.authenticity.create.path, async (req, res) => {
    try {
      const input = api.authenticity.create.input.parse(req.body);
      const item = await storage.createAuthenticityReport(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Feedback
  app.get(api.feedback.list.path, async (req, res) => {
    const items = await storage.getFeedback();
    res.json(items);
  });

  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      const item = await storage.createFeedback(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Seed DB with an admin user if none exists
  try {
    const existing = await storage.getAllUsers();
    if (existing.length === 0) {
      await storage.createUser({
        name: "System Admin",
        email: "admin@pharmachain.local",
        password: "admin",
        phone: "555-0000",
        organization: "PharmaChain Org",
        role: "admin",
        isApproved: true,
      });
      console.log("Seeded default admin user");
    }
  } catch (e) {
    console.error("Error seeding:", e);
  }

  return httpServer;
}
