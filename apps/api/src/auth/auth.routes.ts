import { Router } from "express";
import "express-session";

import passport, { isGoogleAuthConfigured } from "./google.strategy.js";

import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/google", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    res.status(503).json({
      error: "Google OAuth is not configured.",
    });
    return;
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";

    if (!isGoogleAuthConfigured) {
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      return;
    }

    passport.authenticate("google", {
      failureRedirect: `${frontendUrl}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  (_req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
    res.redirect(frontendUrl);
  }
);

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      authenticated: false,
      user: null,
    });

    return;
  }

  res.json({
    authenticated: true,
    user: req.user,
  });
});

router.post("/demo", async (req, res, next) => {
  try {
    let user = await prisma.user.findFirst({
      where: { email: "student@university.edu" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "student@university.edu",
          name: "University Student",
          image: null,
          provider: "demo",
          providerId: "demo-student-1",
        },
      });
    }

    req.login(user, (error) => {
      if (error) {
        return next(error);
      }

      return res.json({
        authenticated: true,
        user,
      });
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/logout",
  (req, res, next) => {
    req.logout((error) => {
      if (error) {
        return next(error);
      }

      req.session.destroy(
        (sessionError: Error | null) => {
          if (sessionError) {
            return next(sessionError);
          }

          res.clearCookie("connect.sid");

          res.json({
            success: true,
          });
        }
      );
    });
  }
);

export default router;




// GET  /api/auth/google
// GET  /api/auth/google/callback
// GET  /api/auth/me
// POST /api/auth/logout