// ui/src/components/MarkdownDisplay.tsx

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface MarkdownDisplayProps {
    content: string;
    className?: string;
}

export function MarkdownDisplay({
    content,
    className = ""
}: MarkdownDisplayProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Handle code blocks with syntax highlighting
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={atomDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        ) : (
                            <code
                                className={`${className} bg-slate-100 dark:bg-slate-800 px-1 rounded`}
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Customize headings
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-4 mb-2">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-bold mt-4 mb-2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-bold mt-3 mb-2">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-md font-bold mt-3 mb-1">
                            {children}
                        </h4>
                    ),

                    // Style paragraph elements
                    p: ({ children }) => <p className="my-2">{children}</p>,

                    // Style list elements
                    ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-2">{children}</ol>
                    ),
                    li: ({ children }) => <li className="my-1">{children}</li>,

                    // Style blockquotes
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 italic my-3">
                            {children}
                        </blockquote>
                    ),

                    // Style links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {children}
                        </a>
                    ),

                    // Style tables
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {children}
                        </tbody>
                    ),
                    tr: ({ children }) => <tr>{children}</tr>,
                    th: ({ children }) => (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-6 py-4 whitespace-nowrap">
                            {children}
                        </td>
                    ),

                    // Style horizontal rules
                    hr: () => (
                        <hr className="my-4 border-gray-200 dark:border-gray-700" />
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
