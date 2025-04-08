// ui/src/components/MarkdownDisplay.tsx

// Note: You'll need to install a markdown library like 'react-markdown'
// npm install react-markdown

interface MarkdownDisplayProps {
    content: string;
    className?: string;
}

export function MarkdownDisplay({
    content,
    className = ""
}: MarkdownDisplayProps) {
    // This is a placeholder - in a real implementation, you would use a
    // markdown library like react-markdown to properly render the content

    // Simple implementation to render code blocks and line breaks
    const formatContent = (text: string) => {
        // Split by code blocks
        const parts = text.split(/```([\s\S]*?)```/);

        return parts.map((part, index) => {
            // Code blocks will be at odd indices
            if (index % 2 === 1) {
                return (
                    <pre
                        key={index}
                        className="bg-slate-100 dark:bg-slate-800 p-4 rounded my-2 overflow-x-auto"
                    >
                        <code>{part.trim()}</code>
                    </pre>
                );
            }

            // Regular text - handle line breaks
            return (
                <div key={index}>
                    {part.split("\n").map((line, lineIndex) => {
                        // Handle headings
                        if (line.startsWith("# ")) {
                            return (
                                <h1
                                    key={lineIndex}
                                    className="text-2xl font-bold mt-4 mb-2"
                                >
                                    {line.substring(2)}
                                </h1>
                            );
                        }
                        if (line.startsWith("## ")) {
                            return (
                                <h2
                                    key={lineIndex}
                                    className="text-xl font-bold mt-4 mb-2"
                                >
                                    {line.substring(3)}
                                </h2>
                            );
                        }
                        if (line.startsWith("### ")) {
                            return (
                                <h3
                                    key={lineIndex}
                                    className="text-lg font-bold mt-3 mb-2"
                                >
                                    {line.substring(4)}
                                </h3>
                            );
                        }

                        // Handle bullet points
                        if (line.startsWith("- ")) {
                            return (
                                <li key={lineIndex} className="ml-4">
                                    {line.substring(2)}
                                </li>
                            );
                        }

                        // Regular line
                        return (
                            <p key={lineIndex} className="my-2">
                                {line}
                            </p>
                        );
                    })}
                </div>
            );
        });
    };

    return (
        <div className={`markdown-content ${className}`}>
            {formatContent(content)}
        </div>
    );
}
