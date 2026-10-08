CREATE TABLE `careerPredictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`results` json NOT NULL,
	`model` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `careerPredictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `careerSkills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`careerId` int NOT NULL,
	`skillId` int NOT NULL,
	`requirementType` enum('required','preferred') NOT NULL DEFAULT 'required',
	`importance` int NOT NULL,
	`minimumProficiency` int NOT NULL,
	`learningOrder` int NOT NULL,
	CONSTRAINT `careerSkills_id` PRIMARY KEY(`id`),
	CONSTRAINT `career_skill_unique` UNIQUE(`careerId`,`skillId`)
);
--> statement-breakpoint
CREATE TABLE `careers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(140) NOT NULL,
	`domain` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`growthIndicator` varchar(40) NOT NULL,
	`demand` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `careers_id` PRIMARY KEY(`id`),
	CONSTRAINT `careers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `industryTrends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` text NOT NULL,
	`relatedDomain` varchar(80) NOT NULL,
	`impact` varchar(24) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `industryTrends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roadmapItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roadmapId` int NOT NULL,
	`skillId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`position` int NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roadmapItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `roadmap_skill_unique` UNIQUE(`roadmapId`,`skillId`)
);
--> statement-breakpoint
CREATE TABLE `roadmaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`careerId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roadmaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(90) NOT NULL,
	`name` varchar(120) NOT NULL,
	`domain` varchar(80) NOT NULL,
	`difficulty` varchar(24) NOT NULL,
	`demand` int NOT NULL,
	`trending` boolean NOT NULL DEFAULT false,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `studentCertifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`issuer` varchar(160),
	`year` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentCertifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentExperiences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`organization` varchar(160),
	`description` text,
	`durationMonths` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentExperiences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`educationLevel` varchar(80),
	`degree` varchar(160),
	`institution` varchar(200),
	`graduationYear` int,
	`bio` text,
	`interests` json NOT NULL,
	`preferredDomains` json NOT NULL,
	`workPreference` varchar(80),
	`careerGoal` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `studentProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `studentProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`url` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studentSkills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillId` int NOT NULL,
	`proficiency` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentSkills_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_skill_unique` UNIQUE(`userId`,`skillId`)
);
--> statement-breakpoint
CREATE TABLE `studentTargets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`careerId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentTargets_id` PRIMARY KEY(`id`),
	CONSTRAINT `studentTargets_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `careerPredictions` ADD CONSTRAINT `careerPredictions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `careerSkills` ADD CONSTRAINT `careerSkills_careerId_careers_id_fk` FOREIGN KEY (`careerId`) REFERENCES `careers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `careerSkills` ADD CONSTRAINT `careerSkills_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmapItems` ADD CONSTRAINT `roadmapItems_roadmapId_roadmaps_id_fk` FOREIGN KEY (`roadmapId`) REFERENCES `roadmaps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmapItems` ADD CONSTRAINT `roadmapItems_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmaps` ADD CONSTRAINT `roadmaps_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmaps` ADD CONSTRAINT `roadmaps_careerId_careers_id_fk` FOREIGN KEY (`careerId`) REFERENCES `careers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentCertifications` ADD CONSTRAINT `studentCertifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentExperiences` ADD CONSTRAINT `studentExperiences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentProfiles` ADD CONSTRAINT `studentProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentProjects` ADD CONSTRAINT `studentProjects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentSkills` ADD CONSTRAINT `studentSkills_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentSkills` ADD CONSTRAINT `studentSkills_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentTargets` ADD CONSTRAINT `studentTargets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studentTargets` ADD CONSTRAINT `studentTargets_careerId_careers_id_fk` FOREIGN KEY (`careerId`) REFERENCES `careers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prediction_user_idx` ON `careerPredictions` (`userId`);--> statement-breakpoint
CREATE INDEX `career_skill_career_idx` ON `careerSkills` (`careerId`);--> statement-breakpoint
CREATE INDEX `career_domain_idx` ON `careers` (`domain`);--> statement-breakpoint
CREATE INDEX `roadmap_item_roadmap_idx` ON `roadmapItems` (`roadmapId`);--> statement-breakpoint
CREATE INDEX `roadmap_user_idx` ON `roadmaps` (`userId`);--> statement-breakpoint
CREATE INDEX `roadmap_career_idx` ON `roadmaps` (`careerId`);--> statement-breakpoint
CREATE INDEX `skill_domain_idx` ON `skills` (`domain`);--> statement-breakpoint
CREATE INDEX `profile_user_idx` ON `studentProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `student_skill_user_idx` ON `studentSkills` (`userId`);