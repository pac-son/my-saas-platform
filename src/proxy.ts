import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define the sensitive routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', 
  '/api/deposits',
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. If the user is on a protected route, force them to sign in
  if (isProtectedRoute(req)) {
    await auth.protect(); 
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};