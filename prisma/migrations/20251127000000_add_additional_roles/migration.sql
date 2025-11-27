-- Add additionalRoles field to support users with multiple roles
ALTER TABLE "users" ADD COLUMN "additionalRoles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[];

-- Create index for better query performance
CREATE INDEX "users_additionalRoles_idx" ON "users" USING GIN ("additionalRoles");

-- Add comment for documentation
COMMENT ON COLUMN "users"."additionalRoles" IS 'Additional roles a user can have beyond their primary userRole. Allows users to access multiple dashboards.';
