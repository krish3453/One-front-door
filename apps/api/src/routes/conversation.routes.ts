import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = Router();

/*
 * GET /api/conversations
 * List all conversations for the authenticated user
 */
router.get("/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || "Untitled Conversation",
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0] ?? null,
    }));

    res.json({
      conversations: formatted,
    });
  } catch (error) {
    console.error("[API] Failed to fetch conversations:", error);
    res.status(500).json({ error: "Failed to load conversations." });
  }
});

/*
 * GET /api/conversations/:id
 * Retrieve a single conversation and its full message history
 */
router.get("/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = String(req.params.id);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages,
      },
    });
  } catch (error) {
    console.error("[API] Failed to fetch conversation:", error);
    res.status(500).json({ error: "Failed to load conversation details." });
  }
});

/*
 * DELETE /api/conversations/:id
 * Delete a conversation and its messages
 */
router.delete("/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = String(req.params.id);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    res.json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error("[API] Failed to delete conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation." });
  }
});

export default router;
