import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  BookOpen,
  Newspaper,
  MessageSquare,
  FileEdit,
  FileText,
  Users,
  Shield,
  ListOrdered,
  Palette,
  Brush,
  Globe,
  Sparkles,
  Settings,
} from "lucide-react";
import type { CityNode } from "./city-data";

export function CityNodeIcon({
  iconKey,
  className = "size-4",
}: {
  iconKey: CityNode["iconKey"];
  className?: string;
}) {
  switch (iconKey) {
    case "dashboard":
      return <LayoutDashboard className={className} aria-hidden />;
    case "registrations":
      return <ClipboardList className={className} aria-hidden />;
    case "leads":
      return <Inbox className={className} aria-hidden />;
    case "courses":
      return <BookOpen className={className} aria-hidden />;
    case "posts":
      return <Newspaper className={className} aria-hidden />;
    case "comments":
      return <MessageSquare className={className} aria-hidden />;
    case "pages":
      return <FileEdit className={className} aria-hidden />;
    case "files":
      return <FileText className={className} aria-hidden />;
    case "users":
      return <Users className={className} aria-hidden />;
    case "roles":
      return <Shield className={className} aria-hidden />;
    case "menus":
      return <ListOrdered className={className} aria-hidden />;
    case "theme":
      return <Palette className={className} aria-hidden />;
    case "illustration":
      return <Brush className={className} aria-hidden />;
    case "globe":
      return <Globe className={className} aria-hidden />;
    case "assistant":
      return <Sparkles className={className} aria-hidden />;
    case "settings":
      return <Settings className={className} aria-hidden />;
  }
}
