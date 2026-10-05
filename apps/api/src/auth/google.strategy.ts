import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";

import { prisma } from "../lib/prisma.js";

/*
 * Extend Passport's Express.User type.
 *
 * Passport's default Express.User interface does not
 * know that our authenticated user has an `id`.
 */
declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

export const isGoogleAuthConfigured = Boolean(
  clientID && clientSecret && callbackURL
);

if (isGoogleAuthConfigured) {
  passport.use(
  new GoogleStrategy(
    {
      clientID: clientID as string,
      clientSecret: clientSecret as string,
      callbackURL: callbackURL as string,
    },
    async (
      _accessToken,
      _refreshToken,
      profile,
      done
    ) => {
      try {
        const email =
          profile.emails?.[0]?.value;

        if (!email) {
          return done(
            new Error(
              "Google account does not provide an email address"
            )
          );
        }

        const googleImage =
          profile.photos?.[0]?.value ?? null;

        let dbUser =
          await prisma.user.findUnique({
            where: {
              email,
            },
          });

        /*
         * Create the user if this is their first login.
         */
        if (!dbUser) {
          dbUser =
            await prisma.user.create({
              data: {
                email,
                name:
                  profile.displayName ?? null,
                image: googleImage,
                provider: "google",
                providerId: profile.id,
              },
            });
        }

        /*
         * Keep the Google profile information
         * synchronized on subsequent logins.
         */
        else if (
          dbUser.provider !== "google" ||
          dbUser.providerId !== profile.id ||
          dbUser.name !==
            (profile.displayName ?? null) ||
          dbUser.image !== googleImage
        ) {
          dbUser =
            await prisma.user.update({
              where: {
                id: dbUser.id,
              },
              data: {
                provider: "google",
                providerId: profile.id,
                name:
                  profile.displayName ?? null,
                image: googleImage,
              },
            });
        }

        /*
         * Passport stores the Prisma user's ID
         * inside the session.
         */
        return done(null, dbUser);
      } catch (error) {
        return done(error);
      }
    }
  )
  );
} else {
  console.warn(
    "[Auth] Google OAuth is not configured. Demo login remains available."
  );
}

/*
 * Serialize only the database user ID
 * into the session.
 */
passport.serializeUser(
  (user: Express.User, done) => {
    done(null, user.id);
  }
);

/*
 * On subsequent requests, convert the stored
 * user ID back into the full Prisma user.
 */
passport.deserializeUser(
  async (id: string, done) => {
    try {
      const user =
        await prisma.user.findUnique({
          where: {
            id,
          },
        });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);

export default passport;