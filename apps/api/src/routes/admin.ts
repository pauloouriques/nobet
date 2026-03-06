import { events, bets, redemptions, rewards, users } from "@nobet/db";
import {
  createEventSchema,
  createRewardSchema,
  paginationSchema,
  resolveEventSchema,
  updateEventSchema,
  updateRewardSchema,
  updateUserBalanceSchema,
} from "@nobet/shared";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../trpc/trpc.js";

export const adminRouter = router({
  // ─── Overview ──────────────────────────────────────────────────────────────

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [[userCount], [betCount], [pendingBetCount], [balanceSum], [redemptionCount]] =
      await Promise.all([
        ctx.db.select({ value: count(users.id) }).from(users),
        ctx.db.select({ value: count(bets.id) }).from(bets),
        ctx.db
          .select({ value: count(bets.id) })
          .from(bets)
          .where(eq(bets.status, "pending")),
        ctx.db.select({ value: sum(users.balance) }).from(users),
        ctx.db.select({ value: count(redemptions.id) }).from(redemptions),
      ]);

    const recentUsers = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        balance: users.balance,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    return {
      totalUsers: Number(userCount?.value ?? 0),
      totalBets: Number(betCount?.value ?? 0),
      pendingBets: Number(pendingBetCount?.value ?? 0),
      totalNcInCirculation: Number(balanceSum?.value ?? 0),
      totalRewardsRedeemed: Number(redemptionCount?.value ?? 0),
      recentUsers,
    };
  }),

  // ─── Users ─────────────────────────────────────────────────────────────────

  listUsers: adminProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.limit;
    const conditions = [];
    if (input.search) {
      conditions.push(
        or(ilike(users.email, `%${input.search}%`), ilike(users.name, `%${input.search}%`))
      );
    }

    const [items, [{ total }]] = await Promise.all([
      ctx.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          balance: users.balance,
          banned: users.banned,
          createdAt: users.createdAt,
          betCount: sql<number>`(select count(*) from ${bets} where ${bets.userId} = ${users.id})`,
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(offset),
      ctx.db
        .select({ total: count(users.id) })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return { items, total: Number(total), page: input.page, limit: input.limit };
  }),

  getUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, input.userId));

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const userBets = await ctx.db
        .select({
          id: bets.id,
          eventId: bets.eventId,
          homeTeam: events.homeTeam,
          awayTeam: events.awayTeam,
          league: events.sportTitle,
          selection: bets.selection,
          odds: bets.odds,
          stake: bets.stake,
          payout: bets.payout,
          status: bets.status,
          createdAt: bets.createdAt,
        })
        .from(bets)
        .innerJoin(events, eq(bets.eventId, events.id))
        .where(eq(bets.userId, input.userId))
        .orderBy(desc(bets.createdAt))
        .limit(20);

      return { user, bets: userBets };
    }),

  updateUserBalance: adminProcedure
    .input(updateUserBalanceSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, input.userId));

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const newBalance = Math.max(0, user.balance + input.amount);
      await ctx.db.update(users).set({ balance: newBalance }).where(eq(users.id, input.userId));

      return { newBalance };
    }),

  banUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ banned: true }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  unbanUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ banned: false }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ─── Events ────────────────────────────────────────────────────────────────

  listEvents: adminProcedure
    .input(
      paginationSchema.extend({
        completed: z.enum(["all", "upcoming", "finished"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [];
      if (input.completed === "finished") {
        conditions.push(eq(events.completed, true));
      } else if (input.completed === "upcoming") {
        conditions.push(eq(events.completed, false));
      }
      if (input.search) {
        conditions.push(
          or(
            ilike(events.homeTeam, `%${input.search}%`),
            ilike(events.awayTeam, `%${input.search}%`),
            ilike(events.sportTitle, `%${input.search}%`)
          )
        );
      }

      const [items, [{ total }]] = await Promise.all([
        ctx.db
          .select()
          .from(events)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(events.commenceTime))
          .limit(input.limit)
          .offset(offset),
        ctx.db
          .select({ total: count(events.id) })
          .from(events)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return { items, total: Number(total), page: input.page, limit: input.limit };
    }),

  createEvent: adminProcedure.input(createEventSchema).mutation(async ({ ctx, input }) => {
    const id = `custom-${crypto.randomUUID()}`;
    const [ev] = await ctx.db
      .insert(events)
      .values({
        id,
        sportKey: input.sportKey,
        sportTitle: input.sportTitle,
        commenceTime: new Date(input.commenceTime),
        homeTeam: input.homeTeam,
        awayTeam: input.awayTeam,
        completed: false,
      })
      .returning();

    return ev;
  }),

  updateEvent: adminProcedure.input(updateEventSchema).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const updateData: Record<string, unknown> = {};
    if (rest.homeTeam !== undefined) updateData.homeTeam = rest.homeTeam;
    if (rest.awayTeam !== undefined) updateData.awayTeam = rest.awayTeam;
    if (rest.sportTitle !== undefined) updateData.sportTitle = rest.sportTitle;
    if (rest.sportKey !== undefined) updateData.sportKey = rest.sportKey;
    if (rest.commenceTime !== undefined) updateData.commenceTime = new Date(rest.commenceTime);
    if (rest.completed !== undefined) updateData.completed = rest.completed;
    if (rest.scoreHome !== undefined) updateData.scoreHome = rest.scoreHome;
    if (rest.scoreAway !== undefined) updateData.scoreAway = rest.scoreAway;
    if (rest.result !== undefined) updateData.result = rest.result;

    const [updated] = await ctx.db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();

    return updated;
  }),

  resolveEvent: adminProcedure.input(resolveEventSchema).mutation(async ({ ctx, input }) => {
    const [ev] = await ctx.db.select().from(events).where(eq(events.id, input.eventId));

    if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    if (ev.completed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Event already resolved" });
    }

    await ctx.db
      .update(events)
      .set({
        completed: true,
        result: input.result,
        scoreHome: input.scoreHome,
        scoreAway: input.scoreAway,
      })
      .where(eq(events.id, input.eventId));

    const pendingBets = await ctx.db
      .select()
      .from(bets)
      .where(and(eq(bets.eventId, input.eventId), eq(bets.status, "pending")));

    let resolvedCount = 0;
    for (const bet of pendingBets) {
      const betWon =
        (input.result === "home" && bet.selection === "Home") ||
        (input.result === "draw" && bet.selection === "Draw") ||
        (input.result === "away" && bet.selection === "Away");

      const payout = betWon ? Math.floor(bet.stake * Number(bet.odds)) : 0;

      await ctx.db
        .update(bets)
        .set({
          status: betWon ? "won" : "lost",
          payout,
          resolvedAt: new Date(),
        })
        .where(eq(bets.id, bet.id));

      if (betWon && payout > 0) {
        await ctx.db
          .update(users)
          .set({ balance: sql`${users.balance} + ${payout}` })
          .where(eq(users.id, bet.userId));
      }

      resolvedCount++;
    }

    return { resolvedBets: resolvedCount };
  }),

  // ─── Rewards ───────────────────────────────────────────────────────────────

  listRewards: adminProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.limit;
    const conditions = [];
    if (input.search) {
      conditions.push(
        or(
          ilike(rewards.title, `%${input.search}%`),
          ilike(rewards.partnerName, `%${input.search}%`)
        )
      );
    }

    const [items, [{ total }]] = await Promise.all([
      ctx.db
        .select()
        .from(rewards)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(rewards.createdAt))
        .limit(input.limit)
        .offset(offset),
      ctx.db
        .select({ total: count(rewards.id) })
        .from(rewards)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return { items, total: Number(total), page: input.page, limit: input.limit };
  }),

  createReward: adminProcedure.input(createRewardSchema).mutation(async ({ ctx, input }) => {
    const [reward] = await ctx.db
      .insert(rewards)
      .values({
        title: input.title,
        description: input.description,
        type: input.type,
        partnerName: input.partnerName,
        imageUrl: input.imageUrl || null,
        costNc: input.costNc,
        stock: input.stock,
        active: true,
      })
      .returning();

    return reward;
  }),

  updateReward: adminProcedure.input(updateRewardSchema).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const updateData: Record<string, unknown> = {};

    if (rest.title !== undefined) updateData.title = rest.title;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.type !== undefined) updateData.type = rest.type;
    if (rest.partnerName !== undefined) updateData.partnerName = rest.partnerName;
    if (rest.imageUrl !== undefined) updateData.imageUrl = rest.imageUrl || null;
    if (rest.costNc !== undefined) updateData.costNc = rest.costNc;
    if (rest.stock !== undefined) updateData.stock = rest.stock;

    const [updated] = await ctx.db
      .update(rewards)
      .set(updateData)
      .where(eq(rewards.id, id))
      .returning();

    return updated;
  }),

  toggleReward: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [reward] = await ctx.db.select().from(rewards).where(eq(rewards.id, input.id));

      if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found" });

      const [updated] = await ctx.db
        .update(rewards)
        .set({ active: !reward.active })
        .where(eq(rewards.id, input.id))
        .returning();

      return updated;
    }),

  listRedemptions: adminProcedure
    .input(
      paginationSchema.extend({
        status: z.enum(["pending", "fulfilled", "cancelled", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(redemptions.status, input.status));
      }

      const [items, [{ total }]] = await Promise.all([
        ctx.db
          .select({
            id: redemptions.id,
            userId: redemptions.userId,
            userName: users.name,
            userEmail: users.email,
            rewardTitle: rewards.title,
            partnerName: rewards.partnerName,
            costNc: redemptions.costNc,
            status: redemptions.status,
            code: redemptions.code,
            createdAt: redemptions.createdAt,
          })
          .from(redemptions)
          .innerJoin(users, eq(redemptions.userId, users.id))
          .innerJoin(rewards, eq(redemptions.rewardId, rewards.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(redemptions.createdAt))
          .limit(input.limit)
          .offset(offset),
        ctx.db
          .select({ total: count(redemptions.id) })
          .from(redemptions)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return { items, total: Number(total), page: input.page, limit: input.limit };
    }),

  fulfillRedemption: adminProcedure
    .input(z.object({ redemptionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(redemptions)
        .set({ status: "fulfilled" })
        .where(eq(redemptions.id, input.redemptionId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Redemption not found" });
      return updated;
    }),
});
