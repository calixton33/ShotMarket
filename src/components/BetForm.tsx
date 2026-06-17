import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/utils";

const betSchema = z.object({
  stake: z.coerce.number().min(1, "Must bet at least $1").max(10000, "Max bet is $10000"),
});

interface BetFormProps {
  onPlaceBet: (side: "over" | "under", stake: number) => void;
  isPending: boolean;
  marketName: string;
  userBalance: number;
}

export function BetForm({ onPlaceBet, isPending, marketName, userBalance }: BetFormProps) {
  const { toast } = useToast();
  const [selectedSide, setSelectedSide] = useState<"over" | "under" | null>(null);

  const form = useForm<z.infer<typeof betSchema>>({
    resolver: zodResolver(betSchema),
    defaultValues: {
      stake: 10,
    },
  });

  const onSubmit = (data: z.infer<typeof betSchema>) => {
    if (!selectedSide) {
      toast({ title: "Select a side", description: "You must choose OVER or UNDER.", variant: "destructive" });
      return;
    }
    if (data.stake > userBalance) {
      toast({ title: "Insufficient funds", description: `You only have ${formatMoney(userBalance)}.`, variant: "destructive" });
      return;
    }
    onPlaceBet(selectedSide, data.stake);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-medium">Place Your Bet</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedSide("over")}
                className={`h-16 rounded-2xl font-medium text-xl transition-all border ${
                  selectedSide === "over" 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card border-border hover:border-primary text-foreground"
                }`}
              >
                Over
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide("under")}
                className={`h-16 rounded-2xl font-medium text-xl transition-all border ${
                  selectedSide === "under" 
                    ? "bg-foreground text-background border-foreground" 
                    : "bg-card border-border hover:border-foreground text-foreground"
                }`}
              >
                Under
              </button>
            </div>

            <FormField
              control={form.control}
              name="stake"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">Stake (SC)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold">$</span>
                      <Input 
                        type="number" 
                        className="h-14 bg-background text-xl font-medium pl-8 focus-visible:ring-primary" 
                        {...field} 
                      />
                      <button 
                        type="button" 
                        onClick={() => form.setValue('stake', userBalance)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80"
                      >
                        Max
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-medium"
              disabled={isPending || !selectedSide}
            >
              {isPending ? "Processing..." : `Bet ${selectedSide ? selectedSide.toUpperCase() : ''}`}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
