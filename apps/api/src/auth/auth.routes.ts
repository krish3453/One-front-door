import { Router } from "express";
import "express-session";

import passport from "./google.strategy.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect:
      "http://localhost:5173/login?error=google_auth_failed",
  }),
  (_req, res) => {
    res.redirect("http://localhost:5173");
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