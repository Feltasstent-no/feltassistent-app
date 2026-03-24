/*
  # Create rifles table

  1. New Tables
    - `rifles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `rifle_number` (text, unique per user) - Våpennummer
      - `name` (text) - Valgfritt våpennavn
      - `caliber` (text, nullable) - Kaliber
      - `model` (text, nullable) - Modell
      - `serial_number` (text, nullable) - Serienummer
      - `notes` (text, nullable) - Notater
      - `total_shots` (integer, default 0) - Totalt antall skudd
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `rifles` table
    - Add policy for users to read their own rifles
    - Add policy for users to insert their own rifles
    - Add policy for users to update their own rifles
    - Add policy for users to delete their own rifles
*/

CREATE TABLE IF NOT EXISTS rifles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rifle_number text NOT NULL,
  name text NOT NULL,
  caliber text,
  model text,
  serial_number text,
  notes text,
  total_shots integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rifle_number)
);

ALTER TABLE rifles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rifles"
  ON rifles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rifles"
  ON rifles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rifles"
  ON rifles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rifles"
  ON rifles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
