import React, { useState } from "react";
import {
  LuCheck,
  LuCircle,
  LuSquare,
  LuX,
  LuChevronDown,
  LuChevronRight,
} from "react-icons/lu";
import Header from "./shared/Header";

// Interface for issue item
interface IssueItem {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: Date;
  priority: "low" | "medium" | "high" | "critical";
}

// Interface for issue category
interface IssueCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  issues: IssueItem[];
}

const IssuesPage: React.FC = () => {
  // Sample initial data
  const initialCategories: IssueCategory[] = [
    {
      id: "ui-issues",
      title: "UI Issues",
      icon: <LuSquare className="text-blue-400" size={20} />,
      description:
        "Interface design problems, styling inconsistencies, and visual bugs.",
      issues: [
        {
          id: "ui-1",
          title: "Responsive design issues on mobile",
          description:
            "The file explorer doesn't collapse properly on smaller screens, causing layout problems.",
          status: "in-progress",
          createdAt: new Date("2025-04-02"),
          priority: "high",
        },
        {
          id: "ui-2",
          title: "Inconsistent button styles",
          description:
            "Action buttons across the application have inconsistent styling and hover effects.",
          status: "open",
          createdAt: new Date("2025-04-03"),
          priority: "medium",
        },
      ],
    },
    {
      id: "llm-issues",
      title: "LLM Issues",
      icon: <LuSquare className="text-purple-400" size={20} />,
      description:
        "Problems with AI model responses, prompt handling, and blueprint generation.",
      issues: [
        {
          id: "llm-1",
          title: "Blueprint generation timeout",
          description:
            "Some complex blueprint generation requests time out when they require too many tokens.",
          status: "open",
          createdAt: new Date("2025-04-05"),
          priority: "critical",
        },
        {
          id: "llm-2",
          title: "Inconsistent node naming",
          description:
            "The LLM sometimes generates nodes with inconsistent naming conventions.",
          status: "resolved",
          createdAt: new Date("2025-04-01"),
          priority: "low",
        },
      ],
    },
    {
      id: "backend-issues",
      title: "Backend Issues",
      icon: <LuSquare className="text-green-400" size={20} />,
      description:
        "Server-side problems, database issues, and API endpoint errors.",
      issues: [
        {
          id: "be-1",
          title: "Firebase authentication fails occasionally",
          description:
            "Users report random authentication failures when server load is high.",
          status: "in-progress",
          createdAt: new Date("2025-04-04"),
          priority: "high",
        },
      ],
    },
    {
      id: "integration-issues",
      title: "Integration Issues",
      icon: <LuSquare className="text-amber-400" size={20} />,
      description:
        "Problems with third-party services, API integrations, and external tools.",
      issues: [
        {
          id: "int-1",
          title: "Gemini API rate limiting",
          description:
            "We hit rate limits during peak usage times, causing generation failures.",
          status: "open",
          createdAt: new Date("2025-04-06"),
          priority: "medium",
        },
      ],
    },
  ];

  // State for issue categories
  const [categories, setCategories] =
    useState<IssueCategory[]>(initialCategories);

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(
    initialCategories.reduce(
      (acc, category) => ({ ...acc, [category.id]: true }),
      {}
    )
  );

  // State for showing resolved issues
  const [showResolved, setShowResolved] = useState(true);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Get status badge
  const getStatusBadge = (status: IssueItem["status"]) => {
    switch (status) {
      case "open":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            Open
          </span>
        );
      case "in-progress":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
            Resolved
          </span>
        );
      default:
        return null;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: IssueItem["priority"]) => {
    switch (priority) {
      case "low":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Low
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Medium
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case "critical":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            Critical
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B15] text-white">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-10 pt-32">
        <div className="flex items-center mb-2">
          <LuSquare className="text-purple-500 mr-3" size={28} />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary-300 via-accent-200 to-primary-300 bg-clip-text text-transparent">
            Issues Tracker
          </h1>
        </div>
        <p className="text-gray-400 mb-4 pl-[44px]">
          Track and manage UI, LLM, backend, and integration issues.
        </p>

        {/* Filter toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`flex items-center px-3 py-1.5 rounded-full text-sm ${
              showResolved
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            <LuCheck size={16} className="mr-1.5" />
            <span>{showResolved ? "Showing Resolved" : "Hide Resolved"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {categories.map((category) => {
            // Filter issues based on showResolved state
            const filteredIssues = showResolved
              ? category.issues
              : category.issues.filter((issue) => issue.status !== "resolved");

            return (
              <div
                key={category.id}
                className="bg-[#0A0F1C] rounded-lg overflow-hidden border border-gray-800"
              >
                {/* Category Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-800 hover:bg-[#0D1220] transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center space-x-3">
                    {category.icon}
                    <div>
                      <h2 className="text-lg font-semibold">
                        {category.title}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-[#161F33] px-2 py-1 rounded-md text-sm">
                      {filteredIssues.length} issue
                      {filteredIssues.length !== 1 ? "s" : ""}
                    </span>
                    {expandedCategories[category.id] ? (
                      <LuChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <LuChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Issues List */}
                {expandedCategories[category.id] && (
                  <div className="p-4">
                    {filteredIssues.length > 0 ? (
                      <div className="space-y-4">
                        {filteredIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="bg-[#0D1220] p-4 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium flex-1">
                                {issue.title}
                              </h3>
                              <div className="flex space-x-2">
                                {getPriorityBadge(issue.priority)}
                                {getStatusBadge(issue.status)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 mb-3">
                              {issue.description}
                            </p>
                            <div className="text-xs text-gray-500">
                              Created: {issue.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <LuSquare size={24} className="mx-auto mb-2" />
                        <p>No issues found in this category</p>
                      </div>
                    )}

                    {/* Add New Issue Button */}
                    <button className="mt-4 w-full border border-dashed border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 p-3 rounded-lg flex items-center justify-center transition-colors">
                      <span className="mr-2 font-bold text-lg">+</span>
                      <span>Add New Issue</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IssuesPage;
