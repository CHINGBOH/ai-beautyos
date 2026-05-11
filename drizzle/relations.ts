import { relations } from "drizzle-orm/relations";
import { users, userLearningProgress, knowledgeBase, expertReviews, contentQualityMetrics, userLearningPreferences, learningAnalytics } from "./schema";

export const userLearningProgressRelations = relations(userLearningProgress, ({one}) => ({
	user: one(users, {
		fields: [userLearningProgress.userId],
		references: [users.id]
	}),
	knowledgeBase: one(knowledgeBase, {
		fields: [userLearningProgress.contentId],
		references: [knowledgeBase.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userLearningProgresses: many(userLearningProgress),
	userLearningPreferences: many(userLearningPreferences),
	learningAnalytics: many(learningAnalytics),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({many}) => ({
	userLearningProgresses: many(userLearningProgress),
	expertReviews: many(expertReviews),
	contentQualityMetrics: many(contentQualityMetrics),
	learningAnalytics: many(learningAnalytics),
}));

export const expertReviewsRelations = relations(expertReviews, ({one}) => ({
	knowledgeBase: one(knowledgeBase, {
		fields: [expertReviews.contentId],
		references: [knowledgeBase.id]
	}),
}));

export const contentQualityMetricsRelations = relations(contentQualityMetrics, ({one}) => ({
	knowledgeBase: one(knowledgeBase, {
		fields: [contentQualityMetrics.contentId],
		references: [knowledgeBase.id]
	}),
}));

export const userLearningPreferencesRelations = relations(userLearningPreferences, ({one}) => ({
	user: one(users, {
		fields: [userLearningPreferences.userId],
		references: [users.id]
	}),
}));

export const learningAnalyticsRelations = relations(learningAnalytics, ({one}) => ({
	user: one(users, {
		fields: [learningAnalytics.userId],
		references: [users.id]
	}),
	knowledgeBase: one(knowledgeBase, {
		fields: [learningAnalytics.contentId],
		references: [knowledgeBase.id]
	}),
}));