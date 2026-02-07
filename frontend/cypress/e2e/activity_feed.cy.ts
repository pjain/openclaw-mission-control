/// <reference types="cypress" />

function clerkOriginFromPublishableKey(): string {
  const key = Cypress.env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") as string | undefined;
  if (!key) throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Cypress env");

  const m = /^pk_(?:test|live)_(.+)$/.exec(key);
  if (!m) throw new Error(`Unexpected Clerk publishable key format: ${key}`);

  const decoded = atob(m[1]); // e.g. beloved-ghost-73.clerk.accounts.dev$
  const domain = decoded.replace(/\$$/, "");

  // In practice, the hosted UI in CI redirects to `*.accounts.dev` (no `clerk.` subdomain).
  const normalized = domain.replace(".clerk.accounts.dev", ".accounts.dev");
  return `https://${normalized}`;
}

describe("/activity feed", () => {
  const apiBase = "**/api/v1";

  function stubStreamEmpty() {
    cy.intercept(
      "GET",
      `${apiBase}/activity/task-comments/stream*`,
      {
        statusCode: 200,
        headers: {
          "content-type": "text/event-stream",
        },
        body: "",
      },
    ).as("activityStream");
  }

  function clickSignInAndCompleteOtp({ otp }: { otp: string }) {
    cy.contains(/sign in to view the feed/i).should("be.visible");
    cy.get('[data-testid="activity-signin"]').click();

    const clerkOrigin = clerkOriginFromPublishableKey();

    // Once redirected to Clerk, we must use cy.origin() for all interactions.
    cy.origin(
      clerkOrigin,
      { args: { email: "jane+clerk_test@example.com", otp } },
      ({ email, otp }) => {
        cy.get('input[type="email"], input[name="identifier"]', { timeout: 20_000 })
          .first()
          .should("be.visible")
          .clear()
          .type(email);

        cy.contains('button', /continue|sign in/i).click();

        cy.get('input', { timeout: 20_000 })
          .filter('[inputmode="numeric"], [autocomplete="one-time-code"], [type="tel"], [name="code"], [type="text"]')
          .first()
          .should("be.visible")
          .type(otp);

        cy.contains('button', /verify|continue|sign in/i).click();
      },
    );

    // Back to app
    cy.contains(/live feed/i, { timeout: 30_000 }).should("be.visible");
  }

  it("auth negative: wrong OTP shows an error", () => {
    cy.visit("/activity");

    cy.contains(/sign in to view the feed/i).should("be.visible");
    cy.get('[data-testid="activity-signin"]').click();

    const clerkOrigin = clerkOriginFromPublishableKey();
    cy.origin(
      clerkOrigin,
      { args: { email: "jane+clerk_test@example.com", otp: "000000" } },
      ({ email, otp }) => {
        cy.get('input[type="email"], input[name="identifier"]', { timeout: 20_000 })
          .first()
          .should("be.visible")
          .clear()
          .type(email);

        cy.contains('button', /continue|sign in/i).click();

        cy.get('input', { timeout: 20_000 })
          .filter('[inputmode="numeric"], [autocomplete="one-time-code"], [type="tel"], [name="code"], [type="text"]')
          .first()
          .should("be.visible")
          .type(otp);

        cy.contains('button', /verify|continue|sign in/i).click();

        cy.contains(/invalid|incorrect|try again/i, { timeout: 20_000 }).should("be.visible");
      },
    );
  });

  it("happy path: renders task comment cards", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 200,
      body: {
        items: [
          {
            id: "c1",
            message: "Hello world",
            agent_name: "Kunal",
            agent_role: "QA 2",
            board_id: "b1",
            board_name: "Testing",
            task_id: "t1",
            task_title: "CI hardening",
            created_at: "2026-02-07T00:00:00Z",
          },
        ],
      },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    clickSignInAndCompleteOtp({ otp: "424242" });

    cy.wait("@activityList");
    cy.contains("CI hardening").should("be.visible");
    cy.contains("Hello world").should("be.visible");
  });

  it("empty state: shows waiting message when no items", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 200,
      body: { items: [] },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    clickSignInAndCompleteOtp({ otp: "424242" });

    cy.wait("@activityList");
    cy.contains(/waiting for new comments/i).should("be.visible");
  });

  it("error state: shows failure UI when API errors", () => {
    cy.intercept("GET", `${apiBase}/activity/task-comments*`, {
      statusCode: 500,
      body: { detail: "boom" },
    }).as("activityList");

    stubStreamEmpty();

    cy.visit("/activity");
    clickSignInAndCompleteOtp({ otp: "424242" });

    cy.wait("@activityList");
    cy.contains(/unable to load feed|boom/i).should("be.visible");
  });
});
