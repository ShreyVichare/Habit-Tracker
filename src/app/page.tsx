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
  goal: number; // Goal for sleep/water, limit for screen
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
    goal: 2, // Limit
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

// Main component
export default function HabitTracker() {
  const dailyTracker = useRef<HTMLDivElement | null>(null);
  const weeklyTracker = useRef<HTMLDivElement | null>(null);

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

  // Prepare weekly chart data
  const getWeeklyChartData = (habit: HabitData) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Past 7 days
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

  // Calculate streaks and check time-based reminders
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    // Calculate streaks
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

    // Time-based reminders (e.g., 8 PM)
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
    // Clear reminders for this habit type when logging
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-lg p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-green-600">HabitTracker</div>
        <div className="flex space-x-4 items-center">
          <button
            onClick={scrollToWeeklyTracker}
            className="text-gray-600 hover:text-green-600 transition hover:cursor-pointer"
          >
            Stats
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-green-600 transition hover:cursor-pointer"
          >
            Settings
          </button>
          <Image
            src="https://randomuser.me/api/portraits/women/2.jpg"
            alt="User"
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
      </nav>

      {/* Landing Page */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center bg-gradient-to-r from-green-500 to-teal-600 text-white p-8"
      >
        <h1 className="text-5xl font-extrabold mb-4 text-center">
          Build Better Habits Today
        </h1>
        <p className="text-lg mb-6 text-center max-w-2xl">
          Track your sleep, water intake, and screen time effortlessly. Set
          goals, monitor progress, and stay motivated with streaks and
          reminders.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-green-600 px-6 py-3 rounded-full font-semibold shadow-lg hover:cursor-pointer"
          onClick={scrollToDailyTracker}
        >
          Start Tracking
        </motion.button>
        <Image
          src="https://plus.unsplash.com/premium_photo-1666299799345-8c491695b026?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Wellness"
          width={800}
          height={400}
          className="mt-8 rounded-lg shadow-xl"
        />
      </motion.div>

      {/* Dashboard */}
      <div className="flex-1 p-4 md:p-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">
          Your Habits
        </h2>
        {/* Weekly Stats (Graphs) */}
        <div className="mb-8" ref={weeklyTracker}>
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">
            Weekly Stats (Past 7 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {habits.map((habit) => {
              const { chartData, average } = getWeeklyChartData(habit);
              return (
                <motion.div
                  key={habit.type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-4 rounded-xl shadow-md border border-gray-100"
                >
                  <h4 className="text-lg font-semibold capitalize mb-2">
                    {habit.type}
                  </h4>
                  <p className="text-gray-600 mb-2">
                    {habit.type === "screen" ? "Limit" : "Goal"}: {habit.goal}{" "}
                    {habit.unit}
                  </p>
                  <p className="text-gray-600 mb-2">
                    Average: {average.toFixed(1)} {habit.unit}/day
                  </p>
                  <p className="text-gray-600 mb-4">
                    Streak: {streaks[habit.type]} days
                    {streaks[habit.type] >= 3 && (
                      <span className="ml-2 text-yellow-500">🏆</span>
                    )}
                  </p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis
                          domain={[
                            0,
                            habit.type === "sleep"
                              ? 12
                              : habit.type === "water"
                              ? 12
                              : 8,
                          ]}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
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
                          strokeWidth={1}
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
        {/* Time-Based Reminders */}
        <div className="mb-6">
          {reminders.map((reminder) => (
            <p key={reminder.habitType} className="text-red-600 mb-2">
              {reminder.message}
            </p>
          ))}
        </div>
        {/* Habit Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
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
                transition={{ duration: 0.3 }}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold capitalize">
                    {habit.type}
                  </h3>
                  {/* Progress Circle */}
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray={`${progress}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                      {Math.round(progress)}%
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-2">
                  {habit.type === "screen" ? "Limit" : "Goal"}: {habit.goal}{" "}
                  {habit.unit}
                </p>
                <p className="text-gray-600 mb-4">
                  Streak: {streaks[habit.type]} days
                  {streaks[habit.type] >= 3 && (
                    <span className="ml-2 text-yellow-500">🏆</span>
                  )}
                </p>
                {isBelowGoal && (
                  <p className="text-red-600 mb-4">
                    You missed your {habit.type} goal today!
                  </p>
                )}
                {exceededScreenLimit && (
                  <p className="text-red-600 mb-4">
                    You exceeded your screen time limit today!
                  </p>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
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
                      className="w-20 p-2 border rounded-lg"
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
                      className="w-full"
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {todayLog} {habit.unit}
                  </div>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={habit.logs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <h2 className="text-xl font-semibold mb-4">Settings</h2>
              <p className="mb-4">Adjust your daily goals and limits.</p>
              {habits.map((habit) => (
                <div key={habit.id} className="mb-4">
                  <label className="block text-sm font-medium capitalize">
                    {habit.type === "screen"
                      ? "Screen Limit"
                      : `${habit.type} Goal`}
                  </label>
                  <input
                    type="number"
                    value={habit.goal}
                    onChange={(e) =>
                      updateGoal(habit.id, Number(e.target.value))
                    }
                    className="w-full p-2 border rounded-lg"
                    min="1"
                    step={habit.type === "sleep" ? 0.5 : 1}
                  />
                </div>
              ))}
              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <h2 className="text-xl font-semibold mb-4">About HabitTracker</h2>
              <p className="text-gray-600 mb-4">
                HabitTracker is a personal analytics tool designed to help you
                build and maintain healthy habits. Track your sleep, water
                intake, and screen time with ease, and gain insights through
                intuitive charts and streaks.
              </p>
              <p className="text-gray-600 mb-4">
                This is a demo application built with Next.js, Tailwind CSS,
                Framer Motion, and Recharts. Contact us at{" "}
                <a
                  href="mailto:shreyvichare@gmail.com"
                  className="text-green-600 hover:text-green-500"
                >
                  shreyvichare@gmail.com
                </a>{" "}
                for more information.
              </p>
              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAbout(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <h2 className="text-xl font-semibold mb-4">Privacy Policy</h2>
              <p className="text-gray-600 mb-4">
                At HabitTracker, we value your privacy. We collect data on your
                sleep, water intake, and screen time to provide personalized
                insights. All data is stored locally in your browser and is not
                shared with third parties.
              </p>
              <p className="text-gray-600 mb-4">
                Your data is used solely to generate charts, streaks, and
                reminders. For questions, contact{" "}
                <a
                  href="mailto:shreyvichare@gmail.com"
                  className="text-green-600 hover:text-green-500"
                >
                  shreyvichare@gmail.com
                </a>
                .
              </p>
              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPrivacy(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#1f2937] p-8 shadow-lg mt-auto border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="text-gray-200">
            © 2025 HabitTracker. All rights reserved.
          </div>
          <div className="text-gray-200 space-y-2">
            <p>
              <span className="font-semibold">Email: </span>
              <a
                href="mailto:shreyvichare@gmail.com"
                className="hover:text-green-500 transition"
              >
                shreyvichare@gmail.com
              </a>
            </p>
            <p>
              <span className="font-semibold">Phone: </span>
              <a
                href="tel:+9891234567"
                className="hover:text-green-500 transition"
              >
                9891234567
              </a>
            </p>
          </div>
          <div className="flex justify-center md:justify-start space-x-6">
            <button
              onClick={() => setShowAbout(true)}
              className="text-gray-200 hover:text-green-500 transition hover:cursor-pointer"
            >
              About
            </button>

            <button
              onClick={() => setShowPrivacy(true)}
              className="text-gray-200 hover:text-green-500 transition hover:cursor-pointer"
            >
              Privacy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
