// components/layout/AppLayout.tsx
import { ReactNode, Children } from "react";

interface ScenarioLayoutProps {
    children: ReactNode;
}

export function ScenarioLayout({ children }: ScenarioLayoutProps) {
    const childrenArray = Children.toArray(children);

    return (
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3">{childrenArray[0]}</div>
            <div className="col-span-6">{childrenArray[1]}</div>
            <div className="col-span-3">{childrenArray[2]}</div>
            <div className="col-span-12 mt-4">{childrenArray[3]}</div>
        </div>
    );
}
