CREATE TABLE `skillPrerequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skillId` int NOT NULL,
	`prerequisiteSkillId` int NOT NULL,
	CONSTRAINT `skillPrerequisites_id` PRIMARY KEY(`id`),
	CONSTRAINT `skill_prerequisite_unique` UNIQUE(`skillId`,`prerequisiteSkillId`)
);
--> statement-breakpoint
ALTER TABLE `skillPrerequisites` ADD CONSTRAINT `skillPrerequisites_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skillPrerequisites` ADD CONSTRAINT `skillPrerequisites_prerequisiteSkillId_skills_id_fk` FOREIGN KEY (`prerequisiteSkillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `skill_prerequisite_skill_idx` ON `skillPrerequisites` (`skillId`);