-- Create Event Expenses Categories (Budget) table
CREATE TABLE IF NOT EXISTS public.event_expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    planned_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Event Expenses table
CREATE TABLE IF NOT EXISTS public.event_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.event_expense_categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.event_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

-- Policies for anon access (since it's a closed admin panel currently using anon with app-level gates)
CREATE POLICY "Allow anon read event_expense_categories" ON public.event_expense_categories FOR SELECT USING (true);
CREATE POLICY "Allow anon insert event_expense_categories" ON public.event_expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update event_expense_categories" ON public.event_expense_categories FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete event_expense_categories" ON public.event_expense_categories FOR DELETE USING (true);

CREATE POLICY "Allow anon read event_expenses" ON public.event_expenses FOR SELECT USING (true);
CREATE POLICY "Allow anon insert event_expenses" ON public.event_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update event_expenses" ON public.event_expenses FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete event_expenses" ON public.event_expenses FOR DELETE USING (true);
