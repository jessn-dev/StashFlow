export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      documents: {
        Row: {
          content_type: string
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_fees: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_financed: boolean | null
          is_recurring: boolean | null
          loan_id: string
          name: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          is_financed?: boolean | null
          is_recurring?: boolean | null
          loan_id: string
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_financed?: boolean | null
          is_recurring?: boolean | null
          loan_id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_fees_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_fees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_periods: {
        Row: {
          budgeted: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          id: string
          period: string
          rolled_over_amount: number
          spent: number
          user_id: string
        }
        Insert: {
          budgeted?: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          id?: string
          period: string
          rolled_over_amount?: number
          spent?: number
          user_id: string
        }
        Update: {
          budgeted?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          id?: string
          period?: string
          rolled_over_amount?: number
          spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          currency: string
          id: string
          rollover_enabled: boolean | null
          user_id: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          currency?: string
          id?: string
          rollover_enabled?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          currency?: string
          id?: string
          rollover_enabled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base: string
          fetched_at: string | null
          id: string
          rate: number
          target: string
        }
        Insert: {
          base: string
          fetched_at?: string | null
          id?: string
          rate: number
          target: string
        }
        Update: {
          base?: string
          fetched_at?: string | null
          id?: string
          rate?: number
          target?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          currency: string
          date: string
          description: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          currency: string
          date: string
          description: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          currency?: string
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          currency: string
          current_amount: number
          deadline: string | null
          id: string
          name: string
          target_amount: number
          type: Database["public"]["Enums"]["goal_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name: string
          target_amount: number
          type?: Database["public"]["Enums"]["goal_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name?: string
          target_amount?: number
          type?: Database["public"]["Enums"]["goal_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          date: string
          frequency: Database["public"]["Enums"]["income_frequency"] | null
          id: string
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          date: string
          frequency?: Database["public"]["Enums"]["income_frequency"] | null
          id?: string
          notes?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          date?: string
          frequency?: Database["public"]["Enums"]["income_frequency"] | null
          id?: string
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          due_date: string
          id: string
          loan_id: string
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          due_date: string
          id?: string
          loan_id: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string
          id?: string
          loan_id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          commercial_category:
            | Database["public"]["Enums"]["loan_commercial_category"]
            | null
          country_code: string | null
          created_at: string | null
          currency: string
          duration_months: number
          effective_interest_rate: number | null
          end_date: string
          id: string
          installment_amount: number
          interest_basis:
            | Database["public"]["Enums"]["loan_interest_basis"]
            | null
          interest_rate: number
          interest_type: Database["public"]["Enums"]["loan_interest_type"] | null
          lender: string | null
          name: string
          payment_start_date: string | null
          principal: number
          start_date: string
          status: Database["public"]["Enums"]["loan_status"] | null
          user_id: string
          completed_at: string | null
        }
        Insert: {
          commercial_category?:
            | Database["public"]["Enums"]["loan_commercial_category"]
            | null
          country_code?: string | null
          created_at?: string | null
          currency: string
          duration_months: number
          effective_interest_rate?: number | null
          end_date: string
          id?: string
          installment_amount: number
          interest_basis?:
            | Database["public"]["Enums"]["loan_interest_basis"]
            | null
          interest_rate: number
          interest_type?:
            | Database["public"]["Enums"]["loan_interest_type"]
            | null
          lender?: string | null
          name: string
          payment_start_date?: string | null
          principal: number
          start_date: string
          status?: Database["public"]["Enums"]["loan_status"] | null
          user_id: string
          completed_at?: string | null
        }
        Update: {
          commercial_category?:
            | Database["public"]["Enums"]["loan_commercial_category"]
            | null
          country_code?: string | null
          created_at?: string | null
          currency?: string
          duration_months?: number
          effective_interest_rate?: number | null
          end_date?: string
          id?: string
          installment_amount?: number
          interest_basis?:
            | Database["public"]["Enums"]["loan_interest_basis"]
            | null
          interest_rate?: number
          interest_type?:
            | Database["public"]["Enums"]["loan_interest_type"]
            | null
          lender?: string | null
          name?: string
          payment_start_date?: string | null
          principal?: number
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"] | null
          user_id?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          budgeting_enabled: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          preferred_currency: string | null
          rollover_start_month: string | null
        }
        Insert: {
          budgeting_enabled?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          preferred_currency?: string | null
          rollover_start_month?: string | null
        }
        Update: {
          budgeting_enabled?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          preferred_currency?: string | null
          rollover_start_month?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      expense_category:
        | "housing"
        | "food"
        | "transport"
        | "utilities"
        | "healthcare"
        | "entertainment"
        | "education"
        | "personal"
        | "other"
      goal_type: "savings" | "debt"
      income_frequency: "one-time" | "weekly" | "monthly"
      loan_commercial_category:
        | "Asset-Backed"
        | "Personal / Cash"
        | "Statutory / Government"
        | "Educational"
        | "Specialized Retail"
      loan_interest_basis: "30/360" | "Actual/360" | "Actual/365"
      loan_interest_type:
        | "Standard Amortized"
        | "Interest-Only"
        | "Add-on Interest"
        | "Fixed Principal"
      loan_status: "active" | "completed" | "defaulted"
      payment_status: "pending" | "paid" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      expense_category: [
        "housing",
        "food",
        "transport",
        "utilities",
        "healthcare",
        "entertainment",
        "education",
        "personal",
        "other",
      ],
      goal_type: ["savings", "debt"],
      income_frequency: ["one-time", "weekly", "monthly"],
      loan_commercial_category: [
        "Asset-Backed",
        "Personal / Cash",
        "Statutory / Government",
        "Educational",
        "Specialized Retail",
      ],
      loan_interest_basis: ["30/360", "Actual/360", "Actual/365"],
      loan_interest_type: [
        "Standard Amortized",
        "Interest-Only",
        "Add-on Interest",
        "Fixed Principal",
      ],
      loan_status: ["active", "completed", "defaulted"],
      payment_status: ["pending", "paid", "overdue"],
    },
  },
} as const

