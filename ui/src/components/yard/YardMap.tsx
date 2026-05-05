// ui/src/components/yard/YardMap.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
    imagePath: string | null;
    name: string;
}

export function YardMap({ imagePath, name }: Props) {
    if (!imagePath) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        No yard map provided.
                    </p>
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <img
                    src={imagePath}
                    alt={`Yard map: ${name}`}
                    className="w-full h-auto rounded border"
                />
            </CardContent>
        </Card>
    );
}
