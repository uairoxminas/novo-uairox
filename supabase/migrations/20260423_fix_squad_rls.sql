-- Fix RLS policies to allow Admin operations on Squad tables

-- Allow all operations on squad_applications (needed for admin to view and approve/reject)
CREATE POLICY "squad_applications_all_policy" 
ON public.squad_applications FOR ALL 
USING (true);

-- Allow all operations on squad_members (needed for admin to insert, view inactive, update)
CREATE POLICY "squad_members_all_policy" 
ON public.squad_members FOR ALL 
USING (true);
