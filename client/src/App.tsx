import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Admin from "@/pages/Admin";
import Analytics from "@/pages/Analytics";
import Careers from "@/pages/Careers";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Journey from "@/pages/Journey";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import SkillGap from "@/pages/SkillGap";
import Roadmap from "@/pages/Roadmap";
import Trends from "@/pages/Trends";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { PageTransition } from "./components/Motion";
import { ThemeProvider } from "./contexts/ThemeContext";

const guarded = (Page: React.ComponentType) => () => <DashboardLayout><PageTransition><Page /></PageTransition></DashboardLayout>;
const publicPage = (Page: React.ComponentType) => () => <PageTransition><Page /></PageTransition>;
function Router() { return <Switch><Route path="/" component={publicPage(Home)}/><Route path="/login" component={publicPage(Login)}/><Route path="/dashboard" component={guarded(Dashboard)}/><Route path="/profile" component={guarded(Profile)}/><Route path="/careers" component={guarded(Careers)}/><Route path="/skill-gap" component={guarded(SkillGap)}/><Route path="/roadmap" component={guarded(Roadmap)}/><Route path="/journey" component={guarded(Journey)}/><Route path="/analytics" component={guarded(Analytics)}/><Route path="/trends" component={guarded(Trends)}/><Route path="/admin" component={guarded(Admin)}/><Route path="/404" component={publicPage(NotFound)}/><Route component={publicPage(NotFound)}/></Switch>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>; }
