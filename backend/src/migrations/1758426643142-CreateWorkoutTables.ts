import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkoutTables1758426643142 implements MigrationInterface {
    name = 'CreateWorkoutTables1758426643142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workout_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "exercise_id" uuid NOT NULL, "total_reps" integer NOT NULL DEFAULT '0', "valid_reps" integer NOT NULL DEFAULT '0', "total_points" integer NOT NULL DEFAULT '0', "device_orientation" character varying(20) NOT NULL DEFAULT 'portrait', "started_at" TIMESTAMP NOT NULL, "completed_at" TIMESTAMP, "duration_seconds" integer, "is_completed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eea00e05dc78d40b55a588c9f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3a1ec9260afc530837db15579a" ON "workout_sessions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1fffe4356b438367a2b5d4948c" ON "workout_sessions" ("exercise_id") `);
        await queryRunner.query(`CREATE TABLE "squat_reps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "rep_number" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT false, "depth_percentage" numeric(5,2) NOT NULL DEFAULT '0', "form_score" numeric(5,2) NOT NULL DEFAULT '0', "min_knee_angle" numeric(5,2) NOT NULL DEFAULT '0', "max_knee_angle" numeric(5,2) NOT NULL DEFAULT '0', "min_hip_angle" numeric(5,2) NOT NULL DEFAULT '0', "max_hip_angle" numeric(5,2) NOT NULL DEFAULT '0', "knee_tracking_score" numeric(5,2) NOT NULL DEFAULT '0', "balance_score" numeric(5,2) NOT NULL DEFAULT '0', "back_alignment_score" numeric(5,2) NOT NULL DEFAULT '0', "squat_metrics" jsonb, "angle_progression" jsonb, "duration_ms" integer, "feedback_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8922ada44ab7ec58d18e77d4229" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_687be5b29148dbe9b24a437262" ON "squat_reps" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "situp_reps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "rep_number" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT false, "range_of_motion" numeric(5,2) NOT NULL DEFAULT '0', "form_score" numeric(5,2) NOT NULL DEFAULT '0', "min_torso_angle" numeric(5,2) NOT NULL DEFAULT '0', "max_torso_angle" numeric(5,2) NOT NULL DEFAULT '0', "core_engagement_score" numeric(5,2) NOT NULL DEFAULT '0', "neck_alignment_score" numeric(5,2) NOT NULL DEFAULT '0', "situp_metrics" jsonb, "angle_progression" jsonb, "duration_ms" integer, "feedback_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2ecd04c40aa7d3fa6c4b53d68e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2aee5044d256f5cf7f1d34482f" ON "situp_reps" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "pushup_reps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "rep_number" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT false, "depth_percentage" numeric(5,2) NOT NULL DEFAULT '0', "form_score" numeric(5,2) NOT NULL DEFAULT '0', "min_elbow_angle" numeric(5,2) NOT NULL DEFAULT '0', "max_elbow_angle" numeric(5,2) NOT NULL DEFAULT '0', "body_alignment_score" numeric(5,2) NOT NULL DEFAULT '0', "pushup_metrics" jsonb, "angle_progression" jsonb, "duration_ms" integer, "feedback_message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2f041ba0c10964836bc43d5d4c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5087ca79f2379bcade6d21ad76" ON "pushup_reps" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "workout_reps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "rep_number" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT false, "confidence_score" numeric(5,2) NOT NULL DEFAULT '0', "validation_errors" text, "landmark_frames" jsonb, "pose_sequence" jsonb, "calculated_angles" jsonb, "duration_ms" integer, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_52a40f24e36881289626c155b9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ef0467e042b82d99547659ceaf" ON "workout_reps" ("session_id") `);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_3a1ec9260afc530837db15579a5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_1fffe4356b438367a2b5d4948cc" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "squat_reps" ADD CONSTRAINT "FK_687be5b29148dbe9b24a4372626" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "situp_reps" ADD CONSTRAINT "FK_2aee5044d256f5cf7f1d34482f7" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pushup_reps" ADD CONSTRAINT "FK_5087ca79f2379bcade6d21ad761" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_reps" ADD CONSTRAINT "FK_ef0467e042b82d99547659ceaff" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workout_reps" DROP CONSTRAINT "FK_ef0467e042b82d99547659ceaff"`);
        await queryRunner.query(`ALTER TABLE "pushup_reps" DROP CONSTRAINT "FK_5087ca79f2379bcade6d21ad761"`);
        await queryRunner.query(`ALTER TABLE "situp_reps" DROP CONSTRAINT "FK_2aee5044d256f5cf7f1d34482f7"`);
        await queryRunner.query(`ALTER TABLE "squat_reps" DROP CONSTRAINT "FK_687be5b29148dbe9b24a4372626"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_1fffe4356b438367a2b5d4948cc"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_3a1ec9260afc530837db15579a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ef0467e042b82d99547659ceaf"`);
        await queryRunner.query(`DROP TABLE "workout_reps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5087ca79f2379bcade6d21ad76"`);
        await queryRunner.query(`DROP TABLE "pushup_reps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2aee5044d256f5cf7f1d34482f"`);
        await queryRunner.query(`DROP TABLE "situp_reps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_687be5b29148dbe9b24a437262"`);
        await queryRunner.query(`DROP TABLE "squat_reps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fffe4356b438367a2b5d4948c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a1ec9260afc530837db15579a"`);
        await queryRunner.query(`DROP TABLE "workout_sessions"`);
    }

}
