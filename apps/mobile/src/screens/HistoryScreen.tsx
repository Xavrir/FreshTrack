import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { Container, Text, Card } from "../components";
import { supabase } from "../lib/supabase";

function actionLabel(action: string) {
    switch (action) {
        case 'add':
            return 'Added';
        case 'edit':
            return 'Edited';
        case 'consume':
            return 'Consumed';
        case 'waste':
            return 'Wasted';
        case 'delete':
            return 'Deleted';
        default:
            return action;
    }
}

export function HistoryScreen() {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        const { data: {user}, } = await supabase.auth.getUser();

        const { data: household } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user?.id)
            .maybeSingle();

        if (!household) return;

        const { data, error } = await supabase
            .from('inventory_history')
            .select(`
                *,
                inventory_batches (
                    name
                )
            `)
            .eq('household_id', household.household_id)
            .order('created_at', { ascending: false });

        console.log('HISTORY:', data);
        console.log('HISTORY ERROR:', error);

        if (data) {
            setHistory(data);
        }
        
    }

    return (
        <Container safeArea>
            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <Card elevated style={{ marginBottom: 12 }}>
                        <Text variant="h3" weight="bold">
                            {actionLabel(item.action)} - {item.inventory_batches?.name ?? 'Inventory item'}
                        </Text>

                        <Text>
                            Quantity: {item.quantity}
                        </Text>

                        {item.reason && (
                            <Text color="textMuted">
                                Reason: {item.reason}
                            </Text>
                        )}

                        <Text color="textMuted">
                            {new Date(item.created_at).toLocaleString()}
                        </Text>
                    </Card>
                )}
            />
        </Container>
    );
}
