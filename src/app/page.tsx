"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Types
type HabitType = "sleep" | "water" | "screen";
type HabitData = {
  id: number;
  type: HabitType;
  goal: number;
  unit: string;
  logs: { date: string; value: number }[];
};
type Reminder = { habitType: HabitType; message: string };
type WeeklyChartData = {
  date: string;
  value: number;
};

// Mock data (April 27 to May 3, 2025)
const initialHabits: HabitData[] = [
  {
    id: 1,
    type: "sleep",
    goal: 8,
    unit: "hours",
    logs: [
      { date: "2025-04-27", value: 7 },
      { date: "2025-04-28", value: 8 },
      { date: "2025-04-29", value: 6 },
      { date: "2025-04-30", value: 9 },
      { date: "2025-05-01", value: 7 },
      { date: "2025-05-02", value: 8 },
      { date: "2025-05-03", value: 6.5 },
    ],
  },
  {
    id: 2,
    type: "water",
    goal: 8,
    unit: "glasses",
    logs: [
      { date: "2025-04-27", value: 6 },
      { date: "2025-04-28", value: 7 },
      { date: "2025-04-29", value: 5 },
      { date: "2025-04-30", value: 8 },
      { date: "2025-05-01", value: 6 },
      { date: "2025-05-02", value: 7 },
      { date: "2025-05-03", value: 8 },
    ],
  },
  {
    id: 3,
    type: "screen",
    goal: 2,
    unit: "hours",
    logs: [
      { date: "2025-04-27", value: 3 },
      { date: "2025-04-28", value: 2 },
      { date: "2025-04-29", value: 4 },
      { date: "2025-04-30", value: 1 },
      { date: "2025-05-01", value: 2 },
      { date: "2025-05-02", value: 3 },
      { date: "2025-05-03", value: 2.5 },
    ],
  },
];

// Reusable Modal Component
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md w-full border border-emerald-500/20"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {title}
          </h2>
          {children}
          <div className="mt-8 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:ring-2 hover:ring-emerald-300"
              aria-label={`Close ${title} Modal`}
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Main component
export default function HabitTracker() {
  const dailyTracker = useRef<HTMLDivElement | null>(null);
  const weeklyTracker = useRef<HTMLDivElement | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Track client-side mounting

  // Only render particles after mounting on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollToDailyTracker = () => {
    dailyTracker.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToWeeklyTracker = () => {
    weeklyTracker.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [habits, setHabits] = useState<HabitData[]>(initialHabits);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [streaks, setStreaks] = useState<{ [key in HabitType]: number }>({
    sleep: 0,
    water: 0,
    screen: 0,
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Prepare weekly chart data
  const getWeeklyChartData = (habit: HabitData) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      return date.toISOString().split("T")[0];
    });

    const chartData: WeeklyChartData[] = dates.map((date) => {
      const log = habit.logs.find((log) => log.date === date);
      return { date, value: log ? log.value : 0 };
    });

    const weekLogs = habit.logs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= sevenDaysAgo && logDate <= today;
    });
    const totalValue = weekLogs.reduce((sum, log) => sum + log.value, 0);
    const average = weekLogs.length > 0 ? totalValue / weekLogs.length : 0;

    return { chartData, average };
  };

  // Calculate streaks and reminders
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const newStreaks = { sleep: 0, water: 0, screen: 0 };
    habits.forEach((habit) => {
      let streak = 0;
      const sortedLogs = habit.logs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      for (const log of sortedLogs) {
        const meetsTarget =
          habit.type === "screen"
            ? log.value <= habit.goal
            : log.value >= habit.goal;
        if (meetsTarget) {
          streak++;
        } else {
          break;
        }
      }
      newStreaks[habit.type] = streak;
    });
    setStreaks(newStreaks);

    const checkReminders = () => {
      const hour = new Date().getHours();
      if (hour === 20) {
        const today = new Date().toISOString().split("T")[0];
        habits.forEach((habit) => {
          const todayLog = habit.logs.find((log) => log.date === today);
          const message = `Time to log your ${habit.type}!`;
          if (
            !todayLog &&
            !reminders.some(
              (r) => r.habitType === habit.type && r.message === message
            )
          ) {
            setReminders((prev) => [
              ...prev,
              { habitType: habit.type, message },
            ]);
          }
        });
      }
    };
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [habits, reminders]);

  // Handle habit logging
  const logHabit = (habitId: number, value: number) => {
    const today = new Date().toISOString().split("T")[0];
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              logs: [
                ...habit.logs.filter((log) => log.date !== today),
                { date: today, value },
              ],
            }
          : habit
      )
    );
    setReminders((prev) =>
      prev.filter(
        (r) => r.habitType !== habits.find((h) => h.id === habitId)!.type
      )
    );
  };

  // Update goal/limit
  const updateGoal = (habitId: number, newGoal: number) => {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === habitId ? { ...habit, goal: newGoal } : habit
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg p-4 flex justify-between items-center">
        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
          HabitTracker
        </div>
        <div className="flex space-x-6 items-center">
          <button
            onClick={scrollToWeeklyTracker}
            className="text-gray-600 dark:text-gray-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition hover:cursor-pointer text-lg font-medium"
            aria-label="View Weekly Stats"
          >
            Stats
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 dark:text-gray-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition hover:cursor-pointer text-lg font-medium"
            aria-label="Open Settings Modal"
          >
            Settings
          </button>
          <Image
            src="https://randomuser.me/api/portraits/women/2.jpg"
            alt="User Profile"
            width={48}
            height={48}
            className="rounded-full border-2 border-emerald-500/20 hover:scale-105 transition"
          />
        </div>
      </nav>

      {/* Landing Page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white py-16 px-4 overflow-hidden"
      >
        {/* Particle Background (Client-side only) */}
        {isMounted && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-white/20 rounded-full"
                style={{
                  width: Math.random() * 8 + 2,
                  height: Math.random() * 8 + 2,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: Math.random() * 5 + 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl md:text-7xl font-bold tracking-tight text-center mb-6"
        >
          Build Better Habits Today
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl font-medium text-center max-w-3xl mb-8 leading-relaxed"
        >
          Track your sleep, water intake, and screen time effortlessly. Set
          goals, monitor progress, and stay motivated with streaks and insights.
        </motion.p>
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.5)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToDailyTracker}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all"
          aria-label="Start Tracking Habits"
        >
          Start Tracking
        </motion.button>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 max-w-4xl w-full"
        >
          <Image
            src="https://plus.unsplash.com/premium_photo-1666299799345-8c491695b026?q=80&w=2069&auto=format&fit=crop"
            alt="Wellness"
            width={800}
            height={400}
            className="rounded-2xl shadow-2xl border border-white/20"
            priority
          />
        </motion.div>
      </motion.div>

      {/* Dashboard */}
      <div className="flex-1 p-6 md:p-12 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 tracking-tight">
          Your Habits
        </h2>
        {/* Weekly Stats */}
        <div className="mb-12" ref={weeklyTracker}>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Weekly Stats (Past 7 Days)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => {
              const { chartData, average } = getWeeklyChartData(habit);
              return (
                <motion.div
                  key={habit.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-transform"
                >
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white capitalize mb-4">
                    {habit.type}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    <span className="font-semibold">
                      {habit.type === "screen" ? "Limit" : "Goal"}:
                    </span>{" "}
                    {habit.goal} {habit.unit}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    <span className="font-semibold">Average:</span>{" "}
                    {average.toFixed(1)} {habit.unit}/day
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    <span className="font-semibold">Streak:</span>{" "}
                    {streaks[habit.type]} days
                    {streaks[habit.type] >= 3 && (
                      <span className="ml-2 text-yellow-400">🏆</span>
                    )}
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff20"
                        />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis
                          domain={[
                            0,
                            habit.type === "sleep"
                              ? 12
                              : habit.type === "water"
                              ? 12
                              : 8,
                          ]}
                          stroke="#6b7280"
                        />
                        <Tooltip
                          contentStyle={{
                            background: isDarkMode ? "#1f2937" : "#fff",
                            border: "none",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={3}
                          name={habit.unit}
                        />
                        <ReferenceLine
                          y={habit.goal}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{
                            value: habit.type === "screen" ? "Limit" : "Goal",
                            fill: "#ef4444",
                            fontWeight: "600",
                            position: "insideTop",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={() => average}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Average"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        {/* Reminders */}
        <div className="mb-8">
          {reminders.map((reminder) => (
            <motion.p
              key={reminder.habitType}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-500 dark:text-red-400 mb-3 font-medium"
            >
              {reminder.message}
            </motion.p>
          ))}
        </div>
        {/* Habit Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          ref={dailyTracker}
        >
          {habits.map((habit) => {
            const today = new Date().toISOString().split("T")[0];
            const todayLog =
              habit.logs.find((log) => log.date === today)?.value || 0;
            const isBelowGoal =
              (habit.type === "sleep" || habit.type === "water") &&
              todayLog > 0 &&
              todayLog < habit.goal;
            const exceededScreenLimit =
              habit.type === "screen" && todayLog > habit.goal;
            const progress =
              habit.type === "screen"
                ? Math.min((habit.goal / Math.max(todayLog, 1)) * 100, 100)
                : Math.min((todayLog / habit.goal) * 100, 100);
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-transform"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {habit.type}
                  </h3>
                  <motion.div
                    className="relative w-16 h-16"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <motion.path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray={`${progress}, 100`}
                        initial={{ strokeDashoffset: 100 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white">
                      {Math.round(progress)}%
                    </div>
                  </motion.div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <span className="font-semibold">
                    {habit.type === "screen" ? "Limit" : "Goal"}:
                  </span>{" "}
                  {habit.goal} {habit.unit}
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  <span className="font-semibold">Streak:</span>{" "}
                  {streaks[habit.type]} days
                  {streaks[habit.type] >= 3 && (
                    <span className="ml-2 text-yellow-400">🏆</span>
                  )}
                </p>
                {isBelowGoal && (
                  <p className="text-red-500 dark:text-red-400 mb-4 font-medium">
                    You missed your {habit.type} goal today!
                  </p>
                )}
                {exceededScreenLimit && (
                  <p className="text-red-500 dark:text-red-400 mb-4 font-medium">
                    You exceeded your screen time limit today!
                  </p>
                )}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Today’s {habit.type}
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="0"
                      max={
                        habit.type === "sleep"
                          ? 12
                          : habit.type === "water"
                          ? 12
                          : 8
                      }
                      step={habit.type === "sleep" ? 0.5 : 1}
                      value={todayLog}
                      onChange={(e) =>
                        logHabit(habit.id, Number(e.target.value))
                      }
                      className="w-20 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      aria-label={`Log ${habit.type} for today`}
                    />
                    <input
                      type="range"
                      min="0"
                      max={
                        habit.type === "sleep"
                          ? 12
                          : habit.type === "water"
                          ? 12
                          : 8
                      }
                      step={habit.type === "sleep" ? 0.5 : 1}
                      value={todayLog}
                      onChange={(e) =>
                        logHabit(habit.id, Number(e.target.value))
                      }
                      className="w-full accent-emerald-500"
                      aria-label={`Adjust ${habit.type} for today`}
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    {todayLog} {habit.unit}
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={habit.logs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          background: isDarkMode ? "#1f2937" : "#fff",
                          border: "none",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Adjust your daily goals and limits.
        </p>
        {habits.map((habit) => (
          <div key={habit.id} className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {habit.type === "screen" ? "Screen Limit" : `${habit.type} Goal`}
            </label>
            <input
              type="number"
              value={habit.goal}
              onChange={(e) => updateGoal(habit.id, Number(e.target.value))}
              className="w-full p-2 mt-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              min="1"
              step={habit.type === "sleep" ? 0.5 : 1}
              aria-label={`Set ${habit.type} goal`}
            />
          </div>
        ))}
      </Modal>

      <Modal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        title="About HabitTracker"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          HabitTracker is a personal analytics tool designed to help you build
          and maintain healthy habits. Track your sleep, water intake, and
          screen time with ease, and gain insights through intuitive charts and
          streaks.
        </p>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This is a demo application built with Next.js, Tailwind CSS, Framer
          Motion, and Recharts. Contact us at{" "}
          <a
            href="mailto:shreyvichare@gmail.com"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            shreyvichare@gmail.com
          </a>{" "}
          for more information.
        </p>
      </Modal>

      <Modal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          At HabitTracker, we value your privacy. We collect data on your sleep,
          water intake, and screen time to provide personalized insights. All
          data is stored locally in your browser and is not shared with third
          parties.
        </p>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your data is used solely to generate charts, streaks, and reminders.
          For questions, contact{" "}
          <a
            href="mailto:shreyvichare@gmail.com"
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            shreyvichare@gmail.com
          </a>
          .
        </p>
      </Modal>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-[#1f2937] to-[#111827] p-10 shadow-2xl mt-auto border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="text-gray-200">
            © 2025 HabitTracker. All rights reserved.
          </div>
          <div className="text-gray-200 space-y-3">
            <p>
              <span className="font-semibold">Email: </span>
              <a
                href="mailto:shreyvichare@gmail.com"
                className="hover:text-emerald-400 transition"
              >
                shreyvichare@gmail.com
              </a>
            </p>
            <p>
              <span className="font-semibold">Phone: </span>
              <a
                href="tel:+9891234567"
                className="hover:text-emerald-400 transition"
              >
                9891234567
              </a>
            </p>
          </div>
          <div className="flex justify-center md:justify-start space-x-8">
            <button
              onClick={() => setShowAbout(true)}
              className="text-gray-200 hover:text-emerald-400 transition hover:cursor-pointer text-lg font-medium"
              aria-label="Open About Modal"
            >
              About
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-gray-200 hover:text-emerald-400 transition hover:cursor-pointer text-lg font-medium"
              aria-label="Open Privacy Modal"
            >
              Privacy
            </button>
          </div>
        </div>
        <div className="mt-6 flex justify-center space-x-6">
          <a
            href="https://github.com/ShreyVichare"
            className="text-gray-400 hover:text-emerald-400 transition"
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.49v-1.71c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1.01.07 1.54 1.04 1.54 1.04.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0112 6.8c.85 0 1.71.11 2.52.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.56 4.94.36.31.56.84.56 1.69v2.5c0 .28.16.59.67.49C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/shrey-vichare-9a3240259/"
            className="text-gray-400 hover:text-emerald-400 transition"
            aria-label="LinkedIn"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.3c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 11.3h-3v-5.5c0-1.31-.03-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9v5.6h-3v-10h2.88v1.36h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6v5.6z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
