/*
  # Create default active setup trigger for new users

  1. New Function
    - `handle_new_user_setup()` - Automatically creates a row in `user_active_setup` when a new user is created
    - Uses `security definer` to bypass RLS

  2. New Trigger
    - `on_auth_user_created_setup` - Fires after insert on `auth.users`
    - Creates a default active setup entry with only `user_id` set (all other fields nullable)

  3. Notes
    - Ensures every new user gets a default setup row
    - Other fields (weapon, barrel, click_table, etc.) remain null until the user configures them
*/

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_active_setup (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_setup ON auth.users;

CREATE TRIGGER on_auth_user_created_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_setup();
