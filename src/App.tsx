import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Page = "dashboard" | "ads" | "wallet" | "referrals" | "plans" | "admin";
type IconName =
  | "dashboard"
  | "play"
  | "wallet"
  | "users"
  | "crown"
  | "log-out"
  | "menu"
  | "bell"
  | "chevron"
  | "arrow-up"
  | "arrow-right"
  | "copy"
  | "check"
  | "x"
  | "plus"
  | "gift"
  | "clock"
  | "send"
  | "trending"
  | "shield"
  | "info"
  | "pause"
  | "volume"
  | "volume-off"
  | "stop";

type PlanId = "free" | "standard" | "premium" | "premium-pro";

type Referral = {
  id: number;
  name: string;
  username: string;
  email: string;
  joined: string;
  status: "Qualified" | "In progress" | "Invited";
  reward: number;
  hasDeposited: boolean;
};

type Account = {
  username: string;
  email: string;
  balance: number;
  adsWatched: number;
  dailyLimit: number;
  planId: PlanId;
  deposits: number;
  referrals: Referral[];
  activity: { id: number; title: string; time: string; amount: number; type: "earn" | "deposit" | "withdraw" | "pending_deposit" | "pending_withdraw" }[];
  pendingTransactions: { id: number; type: "deposit" | "withdraw"; amount: number; method: string; status: "pending" | "approved" | "rejected"; screenshot?: string; timestamp: number }[];
  loginHistory: { id: number; timestamp: number; device?: string }[];
};

type Ad = {
  id: number;
  brand: string;
  title: string;
  duration: string;
  reward: number;
  category: string;
  colors: string;
  videoUrl: string;
  posterUrl: string;
};

type LiveAdState = "idle" | "requesting" | "ready" | "showing";

type GoogleTagWindow = Window & {
  googletag?: {
    cmd: Array<() => void>;
    [key: string]: any;
  };
};

let gptLoader: Promise<any> | null = null;
let gptServicesEnabled = false;

// Google Publisher Tag is loaded only after a member requests a live rewarded ad.
function loadGooglePublisherTag() {
  if (gptLoader) return gptLoader;

  gptLoader = new Promise((resolve, reject) => {
    const adWindow = window as GoogleTagWindow;
    adWindow.googletag = adWindow.googletag || { cmd: [] };
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.onload = () => resolve(adWindow.googletag);
    script.onerror = () => reject(new Error("Google Publisher Tag could not be loaded."));
    document.head.appendChild(script);
  });

  return gptLoader;
}

const plans: Record<PlanId, { id: PlanId; name: string; price: number; perAdPrice: number; dailyLimit: number; minWithdrawal: number; description: string; highlighted?: boolean }> = {
  free: { id: "free", name: "Free Plan", price: 0, perAdPrice: 5, dailyLimit: 5, minWithdrawal: 1000, description: "Basic plan with 5 ads daily. Deposit Rs. 300 to withdraw." },
  standard: { id: "standard", name: "Standard Plan", price: 300, perAdPrice: 10, dailyLimit: 15, minWithdrawal: 500, description: "More ads daily for regular earners." },
  premium: { id: "premium", name: "Premium Plan", price: 500, perAdPrice: 30, dailyLimit: 25, minWithdrawal: 100, description: "Higher earnings per ad.", highlighted: true },
  "premium-pro": { id: "premium-pro", name: "Premium Pro", price: 1000, perAdPrice: 50, dailyLimit: 40, minWithdrawal: 50, description: "Maximum earning potential." },
};

const supportNumber = "+92 348 0103280";

const ads: Ad[] = [
  { id: 1, brand: "GEM STAR", title: "Watch and Earn with GEM STAR", duration: "10 sec", reward: 5, category: "Earning", colors: "from-emerald-600 via-teal-500 to-cyan-500", videoUrl: "https://videos.pexels.com/video-files/6682060/6682060-uhd_3840_2160_25fps.mp4", posterUrl: "https://images.pexels.com/videos/6682060/pexels-photo-6682060.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { id: 2, brand: "PAKISTAN TELECOM", title: "Latest mobile offers", duration: "12 sec", reward: 5, category: "Telecom", colors: "from-violet-700 via-indigo-600 to-blue-600", videoUrl: "https://videos.pexels.com/video-files/7567647/7567647-hd_1920_1080_25fps.mp4", posterUrl: "https://images.pexels.com/videos/7567647/pexels-photo-7567647.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { id: 3, brand: "EASYPAISA", title: "Digital payments made easy", duration: "10 sec", reward: 5, category: "Finance", colors: "from-orange-500 via-amber-500 to-yellow-400", videoUrl: "https://videos.pexels.com/video-files/6771533/6771533-hd_1920_1080_30fps.mp4", posterUrl: "https://images.pexels.com/videos/6771533/pexels-photo-6771533.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { id: 4, brand: "JAZZ CASH", title: "Send money instantly", duration: "8 sec", reward: 5, category: "Finance", colors: "from-pink-600 via-rose-500 to-orange-400", videoUrl: "https://videos.pexels.com/video-files/7822029/7822029-hd_1920_1080_30fps.mp4", posterUrl: "https://images.pexels.com/videos/7822029/pexels-photo-7822029.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { id: 5, brand: "PAKISTAN ONLINE", title: "E-commerce deals", duration: "13 sec", reward: 5, category: "Shopping", colors: "from-sky-700 via-blue-600 to-indigo-500", videoUrl: "https://videos.pexels.com/video-files/7567647/7567647-hd_1920_1080_25fps.mp4", posterUrl: "https://images.pexels.com/videos/7567647/pexels-photo-7567647.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { id: 6, brand: "PAKISTAN TECH", title: "Latest tech reviews", duration: "12 sec", reward: 5, category: "Technology", colors: "from-fuchsia-600 via-pink-500 to-rose-400", videoUrl: "https://videos.pexels.com/video-files/6682060/6682060-uhd_3840_2160_25fps.mp4", posterUrl: "https://images.pexels.com/videos/6682060/pexels-photo-6682060.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
];

const initialAccount = (): Account => {
  const saved = localStorage.getItem("gemstar-account");
  const savedUsername = localStorage.getItem("gemstar-username") || "";
  const savedEmail = localStorage.getItem("gemstar-email") || "";
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Account;
      // Update username and email from localStorage if available
      if (savedUsername && savedUsername !== parsed.username) {
        parsed.username = savedUsername;
      }
      if (savedEmail && savedEmail !== parsed.email) {
        parsed.email = savedEmail;
      }
      return parsed;
    } catch {
      localStorage.removeItem("gemstar-account");
    }
  }
  return {
    username: savedUsername || "user123",
    email: savedEmail || "user@example.com",
    balance: 0,
    adsWatched: 0,
    dailyLimit: 5,
    planId: "free",
    deposits: 0,
    referrals: [
      { id: 1, name: "Ali Ahmed", username: "ali123", email: "ali@example.com", joined: "12 Apr 2025", status: "Qualified", reward: 100, hasDeposited: true },
      { id: 2, name: "Sara Khan", username: "sara456", email: "sara@example.com", joined: "18 Apr 2025", status: "In progress", reward: 10, hasDeposited: false },
      { id: 3, name: "Hamza Raza", username: "hamza789", email: "hamza@example.com", joined: "20 Apr 2025", status: "Invited", reward: 0, hasDeposited: false },
    ],
    activity: [
      { id: 1, title: "Earned from GEM STAR ad", time: "Today, 10:32 AM", amount: 5, type: "earn" },
      { id: 2, title: "Referral bonus - Ali Ahmed", time: "Yesterday", amount: 100, type: "earn" },
      { id: 3, title: "Earned from Pakistan Telecom", time: "Yesterday", amount: 5, type: "earn" },
    ],
    pendingTransactions: [],
    loginHistory: [],
  };
};

function Icon({ name, size = 20, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    play: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></>,
    wallet: <><path d="M4 7.5V6a2 2 0 0 1 2-2h11.5a2.5 2.5 0 0 1 0 5H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h13a3 3 0 0 0 3-3v-6.5a3 3 0 0 0-3-3H4Z" /><path d="M16 14h.01" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    crown: <><path d="m3 6 3.5 5L12 4l5.5 7L21 6l-2 13H5L3 6Z" /><path d="M5 19h14" /></>,
    "log-out": <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    "arrow-up": <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
    "arrow-right": <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    plus: <path d="M12 5v14M5 12h14" />,
    gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8H7.5A2.5 2.5 0 1 1 10 5.5C10 7 12 8 12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5C14 7 12 8 12 8Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    trending: <><path d="m3 17 6-6 4 4 7-8" /><path d="M15 7h5v5" /></>,
    shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></>,
    "volume-off": <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="m16 9 5 5M21 9l-5 5" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function money(value: number) {
  return `Rs. ${value.toLocaleString("en-PK", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function statusClass(status: Referral["status"]) {
  if (status === "Qualified") return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
  if (status === "In progress") return "bg-amber-50 text-amber-700 ring-amber-600/10";
  return "bg-slate-100 text-slate-600 ring-slate-500/10";
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("gemstar-session") === "active");
  const [showDepositPopup, setShowDepositPopup] = useState(false);
  const [account, setAccount] = useState<Account>(initialAccount);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [watchingAd, setWatchingAd] = useState<Ad | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [walletModal, setWalletModal] = useState<"deposit" | "withdraw" | null>(null);
  const [depositAmount, setDepositAmount] = useState("200");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("JazzCash");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState(() => localStorage.getItem("gemstar-username") || "");
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("gemstar-email") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gamUnitPath, setGamUnitPath] = useState(() => localStorage.getItem("gemstar-gam-rewarded-unit") ?? "");
  const [liveAdState, setLiveAdState] = useState<LiveAdState>("idle");
  const [liveAdAction, setLiveAdAction] = useState<(() => void) | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState<"deposit" | "withdraw" | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("JazzCash");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const currentPlan = plans[account.planId];
  const remainingAds = Math.max(account.dailyLimit - account.adsWatched, 0);
  const referralEarnings = account.referrals.reduce((total, referral) => total + referral.reward, 0);
  const qualifiedReferrals = account.referrals.filter((referral) => referral.status === "Qualified").length;

  useEffect(() => {
    localStorage.setItem("gemstar-account", JSON.stringify(account));
  }, [account]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function completeAd(ad: Ad) {
    setAccount((current) => {
      if (current.adsWatched >= current.dailyLimit) return current;
      const reward = plans[current.planId].perAdPrice;
      return {
        ...current,
        balance: current.balance + reward,
        adsWatched: current.adsWatched + 1,
        activity: [{ id: Date.now(), title: `Earned from ${ad.brand}`, time: "Just now", amount: reward, type: "earn" as const }, ...current.activity].slice(0, 8),
      };
    });
    setWatchingAd(null);
    setToast(`${money(plans[account.planId].perAdPrice)} has been added to your balance.`);
  }

  function showPage(page: Page) {
    setActivePage(page);
    setMobileMenu(false);
  }

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    
    if (isSignupMode) {
      // Signup validation
      if (!loginUsername.trim() || !loginEmail.trim() || !loginPassword.trim() || !confirmPassword.trim()) {
        setLoginError("All fields are required for signup.");
        return;
      }
      
      if (loginPassword !== confirmPassword) {
        setLoginError("Passwords do not match.");
        return;
      }
      
      if (loginPassword.length < 6) {
        setLoginError("Password must be at least 6 characters.");
        return;
      }
    } else {
      // Login validation
      if (!loginUsername.trim() || !loginEmail.trim() || !loginPassword.trim()) {
        setLoginError("Enter username, email and password to continue.");
        return;
      }
    }
    
    const username = loginUsername.trim();
    const email = loginEmail.trim();
    
    // Save to localStorage
    localStorage.setItem("gemstar-session", "active");
    localStorage.setItem("gemstar-username", username);
    localStorage.setItem("gemstar-email", email);
    
    // Create or update account with login history
    const currentAccount = initialAccount();
    const loginEntry = {
      id: Date.now(),
      timestamp: Date.now(),
      device: navigator.userAgent.substring(0, 50) // Save first 50 chars of user agent
    };
    
    const updatedAccount: Account = {
      ...currentAccount,
      username: username,
      email: email,
      loginHistory: [loginEntry, ...currentAccount.loginHistory.slice(0, 9)], // Keep last 10 logins
    };
    
    // Save updated account
    localStorage.setItem("gemstar-account", JSON.stringify(updatedAccount));
    setAccount(updatedAccount);
    setIsLoggedIn(true);
    
    // Check if user is admin
    if (username === "admin" || email === "admin@gemstar.com") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    
    setLoginError("");
    setConfirmPassword(""); // Clear confirm password field
  }

  function logout() {
    localStorage.removeItem("gemstar-session");
    setIsLoggedIn(false);
    setIsSignupMode(false); // Reset to login mode
    setMobileMenu(false);
    setLoginPassword("");
    setLoginUsername("");
    setLoginEmail("");
    setConfirmPassword("");
    // Note: We don't remove username and email from localStorage
    // so user can log back in with same credentials
  }

  function copyReferralLink() {
    const link = "https://gemstar.com/invite/GEMSTAR786";
    navigator.clipboard?.writeText(link).catch(() => undefined);
    setToast("Your referral link has been copied.");
  }

  function inviteReferral(event: FormEvent) {
    event.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setToast("Add a name and email before sending an invite.");
      return;
    }
    setAccount((current) => ({
      ...current,
      referrals: [{ 
        id: Date.now(), 
        name: inviteName.trim(), 
        username: `ref${Date.now()}`, 
        email: inviteEmail.trim(), 
        joined: "Just now", 
        status: "Invited", 
        reward: 0,
        hasDeposited: false 
      }, ...current.referrals],
    }));
    setInviteName("");
    setInviteEmail("");
    setToast("Invite created. You'll earn Rs. 10 immediately and Rs. 100 if they deposit Rs. 300.");
  }

  function qualifyReferral(id: number) {
    const person = account.referrals.find((referral) => referral.id === id);
    if (!person || person.status === "Qualified") return;
    
    const bonus = person.hasDeposited ? 100 : 10;
    
    setAccount((current) => ({
      ...current,
      balance: current.balance + bonus,
      referrals: current.referrals.map((referral) => referral.id === id ? { 
        ...referral, 
        status: "Qualified", 
        reward: bonus
      } : referral),
      activity: [{ id: Date.now(), title: `Referral bonus - ${person.name}`, time: "Just now", amount: bonus, type: "earn" as const }, ...current.activity].slice(0, 8),
    }));
    setToast(`${person.name} qualified. ${money(bonus)} added to your wallet.`);
  }

  function activatePlan() {
    if (!selectedPlan) return;
    const plan = plans[selectedPlan];
    setAccount((current) => ({ ...current, planId: plan.id, dailyLimit: plan.dailyLimit, adsWatched: Math.min(current.adsWatched, plan.dailyLimit) }));
    setSelectedPlan(null);
    setToast(`${plan.name} plan is now active. Your daily ad limit is ${plan.dailyLimit}.`);
  }

  function submitDeposit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount < 300) {
      setToast("Minimum deposit is Rs. 300.");
      return;
    }
    
    // Show payment options instead of directly depositing
    setWalletModal(null);
    setShowPaymentOptions("deposit");
  }

  function submitWithdrawal(event: FormEvent) {
    event.preventDefault();
    
    // Check free plan deposit requirement
    if (account.planId === "free" && account.deposits < 300) {
      setShowDepositPopup(true);
      setWalletModal(null);
      return;
    }
    
    const amount = Number(withdrawAmount);
    if (!amount || amount < currentPlan.minWithdrawal) {
      setToast(`${currentPlan.name} requires at least ${money(currentPlan.minWithdrawal)} per withdrawal.`);
      return;
    }
    if (amount > account.balance) {
      setToast("Your withdrawal amount is higher than your available balance.");
      return;
    }
    
    // Show payment options instead of directly withdrawing
    setWalletModal(null);
    setShowPaymentOptions("withdraw");
  }

  function saveGamUnitPath() {
    const unitPath = gamUnitPath.trim();
    if (!unitPath.startsWith("/")) {
      setToast("Enter a Google Ad Manager rewarded ad-unit path starting with /.");
      return;
    }
    localStorage.setItem("gemstar-gam-rewarded-unit", unitPath);
    setGamUnitPath(unitPath);
    setToast("Live rewarded ad unit saved in this browser.");
  }

  function handleScreenshotUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setToast("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast("File size too large. Maximum 5MB.");
      return;
    }

    setScreenshotFile(file);
  }

  function submitTransactionWithScreenshot() {
    if (!screenshotFile) {
      setToast("Please upload a screenshot of your payment.");
      return;
    }

    const transactionType = showPaymentOptions;
    const amount = transactionType === "deposit" ? Number(depositAmount) : Number(withdrawAmount);
    const method = selectedPaymentMethod;

    setUploadingScreenshot(true);

    // Simulate upload delay
    setTimeout(() => {
      const transactionId = Date.now();
      
      // Create transaction object
      const transaction = {
        id: transactionId,
        type: transactionType as "deposit" | "withdraw",
        amount,
        method,
        status: "pending" as const,
        timestamp: transactionId,
      };

      // Update account with pending transaction
      setAccount((current) => ({
        ...current,
        pendingTransactions: [...current.pendingTransactions, transaction],
        activity: [{
          id: transactionId,
          title: `${transactionType === "deposit" ? "Deposit" : "Withdrawal"} request to ${method}`,
          time: "Just now",
          amount: transactionType === "deposit" ? amount : -amount,
          type: transactionType === "deposit" ? "pending_deposit" : "pending_withdraw"
        }, ...current.activity].slice(0, 8),
      }));

      // Reset states
      setScreenshotFile(null);
      setShowPaymentOptions(null);
      setUploadingScreenshot(false);
      
      setToast(`${transactionType === "deposit" ? "Deposit" : "Withdrawal"} request submitted. Screenshot uploaded. Transaction ID: ${transactionId}. Admin will review.`);
      
      // Reset deposit/withdraw amounts
      if (transactionType === "deposit") {
        setDepositAmount("200");
      } else {
        setWithdrawAmount("");
      }
    }, 1500);
  }

  function approveTransaction(transactionId: number) {
    setAccount((current) => {
      const transaction = current.pendingTransactions.find(t => t.id === transactionId);
      if (!transaction) return current;

      const updatedTransactions = current.pendingTransactions.filter(t => t.id !== transactionId);
      
      if (transaction.type === "deposit" && transaction.status === "pending") {
        return {
          ...current,
          balance: current.balance + transaction.amount,
          deposits: current.deposits + transaction.amount,
          pendingTransactions: updatedTransactions,
          activity: [
            { 
              id: transactionId, 
              title: `Deposit approved via ${transaction.method}`, 
              time: "Just now", 
              amount: transaction.amount, 
              type: "deposit" as const 
            },
            ...current.activity.filter(a => a.id !== transactionId)
          ].slice(0, 8),
        };
      } else if (transaction.type === "withdraw" && transaction.status === "pending") {
        return {
          ...current,
          balance: current.balance - transaction.amount,
          pendingTransactions: updatedTransactions,
          activity: [
            { 
              id: transactionId, 
              title: `Withdrawal approved to ${transaction.method}`, 
              time: "Just now", 
              amount: -transaction.amount, 
              type: "withdraw" as const 
            },
            ...current.activity.filter(a => a.id !== transactionId)
          ].slice(0, 8),
        };
      }
      return current;
    });
  }

  function requestLiveRewardedAd() {
    const unitPath = gamUnitPath.trim();
    if (!unitPath.startsWith("/")) {
      setToast("Save your Google Ad Manager rewarded ad-unit path first.");
      return;
    }

    setLiveAdState("requesting");
    setLiveAdAction(null);

    loadGooglePublisherTag()
      .then((googleTag) => {
        googleTag.cmd.push(() => {
          const slot = googleTag.defineOutOfPageSlot(unitPath, googleTag.enums.OutOfPageFormat.REWARDED);
          if (!slot) {
            setLiveAdState("idle");
            setToast("Rewarded ads are unavailable on this device. Try a mobile optimized page.");
            return;
          }

          let rewardGranted = false;
          let cleanedUp = false;
          const cleanUpSlot = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            googleTag.destroySlots([slot]);
          };

          const onReady = (event: any) => {
            if (event.slot !== slot) return;
            setLiveAdState("ready");
            setLiveAdAction(() => () => {
              const shown = event.makeRewardedVisible();
              if (shown) setLiveAdState("showing");
              else {
                setLiveAdState("idle");
                setToast("The rewarded ad is no longer available. Please request another one.");
                cleanUpSlot();
              }
            });
          };

          const onGranted = (event: any) => {
            if (event.slot !== slot || rewardGranted) return;
            rewardGranted = true;
            setAccount((current) => {
              if (current.adsWatched >= current.dailyLimit) return current;
              return {
                ...current,
                balance: current.balance + 5,
                adsWatched: current.adsWatched + 1,
                activity: [{ id: Date.now(), title: "Live rewarded ad completed", time: "Just now", amount: 5, type: "earn" as const }, ...current.activity].slice(0, 8),
              };
            });
            setToast(`${money(5)} was added after the live rewarded ad was verified.`);
          };

          const onClosed = (event: any) => {
            if (event.slot !== slot) return;
            cleanUpSlot();
            setLiveAdAction(null);
            setLiveAdState("idle");
            if (!rewardGranted) setToast("The ad closed before a reward was granted.");
          };

          googleTag.pubads().addEventListener("rewardedSlotReady", onReady);
          googleTag.pubads().addEventListener("rewardedSlotGranted", onGranted);
          googleTag.pubads().addEventListener("rewardedSlotClosed", onClosed);
          slot.addService(googleTag.pubads());
          if (!gptServicesEnabled) {
            googleTag.enableServices();
            gptServicesEnabled = true;
          }
          googleTag.display(slot);
        });
      })
      .catch(() => {
        setLiveAdState("idle");
        setToast("The live ad service could not load. Check your connection and ad-blocker settings.");
      });
  }

  if (!isLoggedIn) {
    return <main className="min-h-screen bg-[#f6f8f5] p-4 text-slate-950 sm:p-8">
      <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_25px_80px_rgba(20,54,41,0.12)] backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[620px] overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(147,51,234,0.25),transparent_25%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.2),transparent_30%)]" /><div className="relative flex items-center gap-3 text-xl font-semibold tracking-tight"><BrandMark light /> GEM STAR</div><div className="relative max-w-md"><p className="mb-5 text-sm font-bold tracking-[0.2em] text-blue-200">WATCH AND EARN</p><h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.05em]">Earn money by watching ads.</h1><p className="mt-6 max-w-sm text-base leading-7 text-blue-50/75">Watch ads, earn PKR, withdraw via Easypaisa or JazzCash. Get referral bonuses up to Rs. 100.</p></div><div className="relative flex items-center gap-3 text-sm text-blue-100/70"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200/25"><Icon name="shield" size={17} /></span> Pakistani earning platform</div></div>
          <div className="flex min-h-[620px] items-center p-6 sm:p-12"><div className="mx-auto w-full max-w-sm"><div className="mb-12 flex items-center gap-3 lg:hidden"><BrandMark /> <span className="text-xl font-semibold tracking-tight">GEM STAR</span></div><div className="mb-9"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">{isSignupMode ? "Create Account" : "Member Login"}</p><h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{isSignupMode ? "Join GEM STAR" : "Welcome to GEM STAR"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isSignupMode ? "Create your account to start earning." : "Create account or login to start earning."}</p></div><form className="space-y-5" onSubmit={handleLogin}><label className="block text-sm font-medium text-slate-700">Username<input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} type="text" placeholder="yourusername" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label><label className="block text-sm font-medium text-slate-700">Email<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label><label className="block text-sm font-medium text-slate-700">Password<input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" placeholder={isSignupMode ? "Create a password" : "Enter your password"} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>{isSignupMode && <label className="block text-sm font-medium text-slate-700">Confirm Password<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" placeholder="Confirm your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" /></label>}{loginError && <p className="text-sm font-medium text-rose-600">{loginError}</p>}<button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99]">{isSignupMode ? "Sign Up" : "Login"} <span className="transition-transform group-hover:translate-x-0.5"><Icon name="arrow-right" size={17} /></span></button></form><div className="mt-6"><button type="button" onClick={() => setIsSignupMode(!isSignupMode)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800">{isSignupMode ? "Already have an account? Login" : "Need an account? Sign up"}</button>
          </div></div></div>
        </section>
      </div>
    </main>;
  }

  const navItems: { id: Page; label: string; icon: IconName }[] = [
    { id: "dashboard", label: "Overview", icon: "dashboard" },
    { id: "ads", label: "Watch ads", icon: "play" },
    { id: "wallet", label: "Wallet", icon: "wallet" },
    { id: "referrals", label: "Referrals", icon: "users" },
    { id: "plans", label: "Plans", icon: "crown" },
    ...(isAdmin ? [{ id: "admin" as Page, label: "Admin", icon: "shield" as IconName }] : []),
  ];

  return <div className="min-h-screen bg-[#f7f8f7] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-slate-200/80 bg-white px-4 py-6 lg:flex"><div className="flex items-center gap-3 px-3"><BrandMark /><span className="text-xl font-semibold tracking-[-0.04em]">GEM STAR</span></div><nav className="mt-12 space-y-1" aria-label="Primary navigation">{navItems.map((item) => <NavItem key={item.id} item={item} active={activePage === item.id} onClick={() => showPage(item.id)} />)}</nav><div className="mt-auto"><button onClick={() => showPage("plans")} className="w-full rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-left transition hover:from-blue-100 hover:to-indigo-100"><span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white"><Icon name="crown" size={16} /></span><p className="text-sm font-semibold text-blue-600">Upgrade your plan</p><p className="mt-1 text-xs leading-5 text-blue-900/60">Premium members can withdraw from Rs. 50.</p></button><div className="mt-4 border-t border-slate-100 pt-4"><div className="flex items-center gap-3 px-3 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-xs font-bold text-blue-600">GS</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.username}</p><p className="truncate text-xs text-slate-400">{account.planId === "free" ? "Free Plan" : account.planId === "standard" ? "Standard Plan" : account.planId === "premium" ? "Premium Plan" : "Premium Pro Plan"}</p></div></div><button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"><Icon name="log-out" size={18} /> Log out</button></div></div></aside>
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:ml-[252px] lg:px-10"><button onClick={() => setMobileMenu(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Icon name="menu" /></button><div className="hidden lg:block"><p className="text-sm font-medium text-slate-500">Welcome back, {account.username}</p></div><div className="flex items-center gap-2 sm:gap-4"><button onClick={() => setToast("You are all caught up.")} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100" aria-label="Notifications"><Icon name="bell" size={19} /><span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button><button onClick={() => showPage("wallet")} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 pl-2 pr-3 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"><span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Icon name="wallet" size={14} /></span><span className="hidden sm:inline">{money(account.balance)}</span></button></div></header>
    {mobileMenu && <><button onClick={() => setMobileMenu(false)} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" aria-label="Close menu" /><aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white px-4 py-6 shadow-2xl lg:hidden"><div className="flex items-center justify-between px-3"><div className="flex items-center gap-3"><BrandMark /><span className="text-xl font-semibold tracking-[-0.04em]">GEM STAR</span></div><button onClick={() => setMobileMenu(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Icon name="x" /></button></div><nav className="mt-10 space-y-1">{navItems.map((item) => <NavItem key={item.id} item={item} active={activePage === item.id} onClick={() => showPage(item.id)} />)}</nav><button onClick={logout} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600"><Icon name="log-out" size={18} /> Log out</button></aside></>}
    <main className="mx-auto max-w-[1460px] px-4 py-7 pb-24 sm:px-7 lg:ml-[252px] lg:px-10 lg:py-10">{activePage === "dashboard" && <Dashboard account={account} currentPlan={currentPlan} remainingAds={remainingAds} qualifiedReferrals={qualifiedReferrals} onNavigate={showPage} />}{activePage === "ads" && <AdsPage ads={ads} remainingAds={remainingAds} limit={account.dailyLimit} onWatch={(ad) => remainingAds > 0 ? setWatchingAd(ad) : setToast("Your daily ad limit has been reached. Upgrade your plan for more ads.")} onPlans={() => showPage("plans")} gamUnitPath={gamUnitPath} liveAdState={liveAdState} liveAdAction={liveAdAction} onGamUnitChange={setGamUnitPath} onSaveGamUnit={saveGamUnitPath} onRequestLiveAd={requestLiveRewardedAd} />}{activePage === "wallet" && <WalletPage account={account} plan={currentPlan} onDeposit={() => setWalletModal("deposit")} onWithdraw={() => setWalletModal("withdraw")} />}{activePage === "referrals" && <ReferralsPage referrals={account.referrals} qualifiedReferrals={qualifiedReferrals} earnings={referralEarnings} inviteName={inviteName} inviteEmail={inviteEmail} onNameChange={setInviteName} onEmailChange={setInviteEmail} onInvite={inviteReferral} onCopy={copyReferralLink} onQualify={qualifyReferral} />}{activePage === "plans" && <PlansPage activePlan={account.planId} onChoose={setSelectedPlan} />}{activePage === "admin" && isAdmin && <AdminPanel account={account} onApproveTransaction={approveTransaction} />}</main>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white px-2 py-2 shadow-[0_-8px_25px_rgba(15,23,42,0.05)] lg:hidden">{navItems.map((item) => <button key={item.id} onClick={() => showPage(item.id)} className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition ${activePage === item.id ? "text-[#16816e]" : "text-slate-400"}`}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}</nav>
    {watchingAd && <WatchModal ad={watchingAd} onComplete={() => completeAd(watchingAd)} onClose={() => setWatchingAd(null)} />}{selectedPlan && <PlanModal plan={plans[selectedPlan]} onClose={() => setSelectedPlan(null)} onConfirm={activatePlan} />}{walletModal === "deposit" && <DepositModal amount={depositAmount} onAmountChange={setDepositAmount} onClose={() => setWalletModal(null)} onSubmit={submitDeposit} />}{walletModal === "withdraw" && <WithdrawModal plan={currentPlan} amount={withdrawAmount} method={withdrawMethod} onAmountChange={setWithdrawAmount} onMethodChange={setWithdrawMethod} onClose={() => setWalletModal(null)} onSubmit={submitWithdrawal} />}{showDepositPopup && (
    <Overlay>
      <div className="modal-enter w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Icon name="info" size={20} />
          </span>
          <button type="button" onClick={() => setShowDepositPopup(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">Deposit Required for Free Plan</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          Free plan users must deposit at least Rs. 300 to request withdrawals.
        </p>
        
        <div className="mt-4 rounded-lg bg-rose-50 p-3">
          <div className="text-sm text-rose-800">
            <strong>Withdrawal Rule:</strong> Free plan users cannot withdraw until they deposit Rs. 300 or more.
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => setShowDepositPopup(false)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => { setShowDepositPopup(false); setWalletModal("deposit"); }} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700">
            Make Deposit
          </button>
        </div>
      </div>
    </Overlay>
  )}{showPaymentOptions && <PaymentOptionsModal 
      type={showPaymentOptions} 
      amount={showPaymentOptions === "deposit" ? Number(depositAmount) : Number(withdrawAmount)}
      selectedMethod={selectedPaymentMethod}
      screenshotFile={screenshotFile}
      uploading={uploadingScreenshot}
      onMethodChange={setSelectedPaymentMethod}
      onScreenshotUpload={handleScreenshotUpload}
      onSubmit={submitTransactionWithScreenshot}
      onClose={() => { setShowPaymentOptions(null); setScreenshotFile(null); }}
    />}{toast && <div className="toast-enter fixed bottom-24 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl lg:bottom-8"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Icon name="check" size={14} stroke={2.5} /></span>{toast}<button onClick={() => setToast("")} className="ml-auto text-slate-400 hover:text-white"><Icon name="x" size={17} /></button></div>}
  </div>;
}

function BrandMark({ light = false }: { light?: boolean }) { return <span className={`brand-mark inline-flex h-9 w-9 items-center justify-center rounded-xl ${light ? "bg-white text-[#124f46]" : "bg-[#124f46] text-white"}`}><span className="relative block h-4 w-4"><i className="absolute bottom-0 left-0 h-2 w-1.5 rounded-sm bg-current" /><i className="absolute bottom-0 left-[5px] h-3 w-1.5 rounded-sm bg-current opacity-75" /><i className="absolute bottom-0 left-[10px] h-4 w-1.5 rounded-sm bg-current opacity-50" /></span></span>; }
function NavItem({ item, active, onClick }: { item: { id: Page; label: string; icon: IconName }; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#e8f4ee] text-[#126b5a]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon name={item.icon} size={19} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#16816e]" />}</button>; }
function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-enter mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16816e]">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>; }

function Dashboard({ account, currentPlan, remainingAds, qualifiedReferrals, onNavigate }: { account: Account; currentPlan: (typeof plans)[PlanId]; remainingAds: number; qualifiedReferrals: number; onNavigate: (page: Page) => void }) {
  const progress = Math.round((account.adsWatched / account.dailyLimit) * 100);
  
  // Format date for login history
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get last 5 logins
  const recentLogins = account.loginHistory.slice(0, 5);
  
  return (
    <div className="page-enter">
      <PageHeader 
        eyebrow={`Welcome, ${account.username}`} 
        title="Your earning dashboard" 
        description={`Account: ${account.username} | Email: ${account.email} | Member since: ${account.loginHistory.length > 0 ? formatDate(account.loginHistory[account.loginHistory.length - 1].timestamp) : 'New user'}`} 
        action={
          <div className="flex gap-2">
            <button onClick={() => onNavigate("ads")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700">
              <Icon name="play" size={17} /> Watch an ad
            </button>
<button 
  onClick={() => { 
    if (typeof logout === 'function') {
      logout();
    }
    
    localStorage.clear(); 
    sessionStorage.clear();

    setTimeout(() => {
      window.location.reload();
    }, 100);
  }} 
  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
>
  <Icon name="log-out" size={17} /> Logout
</button>          </div>
        } 
      />
      
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available balance" value={money(account.balance)} icon="wallet" accent="bg-emerald-50 text-emerald-700" helper="Ready for withdrawal" onClick={() => onNavigate("wallet")} />
        <Metric label="Ads viewed today" value={`${account.adsWatched} / ${account.dailyLimit}`} icon="play" accent="bg-violet-50 text-violet-700" helper={`${remainingAds} ads remaining`} onClick={() => onNavigate("ads")} />
        <Metric label="Your referrals" value={`${account.referrals.length}`} icon="users" accent="bg-amber-50 text-amber-700" helper={`${qualifiedReferrals} reward qualified`} onClick={() => onNavigate("referrals")} />
        <Metric label="Total deposited" value={money(account.deposits)} icon="trending" accent="bg-sky-50 text-sky-700" helper="Manage wallet funds" onClick={() => onNavigate("wallet")} />
      </section>
      
      <section className="mt-7 grid gap-6 lg:grid-cols-2">
        {/* Progress Section */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100/80">Today&apos;s progress</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Keep your streak alive</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-100">
              <Icon name="trending" size={19} />
            </span>
          </div>
          <div className="my-8 flex items-center gap-6">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#60a5fa ${progress * 3.6}deg, rgba(255,255,255,.14) 0deg)` }}>
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                <strong className="text-xl">{progress}%</strong>
                <span className="text-[10px] uppercase tracking-wider text-blue-100/70">complete</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-[-0.05em]">{remainingAds}</p>
              <p className="mt-1 text-sm leading-5 text-blue-100/70">ads left from your daily allowance of {account.dailyLimit}</p>
            </div>
          </div>
          <button onClick={() => onNavigate("ads")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:from-green-600 hover:to-emerald-600">
            Continue earning <Icon name="arrow-right" size={17} />
          </button>
          <p className="mt-4 text-center text-xs text-blue-100/55">Current plan: {currentPlan.name}</p>
        </div>
        
        {/* Login History Section */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon name="clock" size={19} />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Login History</h2>
              <p className="text-sm text-slate-500">Recent account access records</p>
            </div>
          </div>
          
          {recentLogins.length > 0 ? (
            <div className="space-y-3">
              {recentLogins.map((login) => (
                <div key={login.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                      <Icon name="check" size={14} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Successful Login</p>
                      <p className="text-xs text-slate-500">{formatDate(login.timestamp)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {login.device?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mx-auto mb-3">
                <Icon name="clock" size={20} />
              </span>
              <p className="text-sm text-slate-500">No login history yet</p>
              <p className="text-xs text-slate-400 mt-1">Login history will appear here after you log in</p>
            </div>
          )}
          
          {account.loginHistory.length > 5 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                Showing 5 of {account.loginHistory.length} logins
              </p>
            </div>
          )}
        </div>
      </section>
      
      <section className="mt-7 rounded-2xl border border-amber-200/80 bg-[#fffaf0] px-5 py-5 sm:flex sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Icon name="crown" size={19} />
          </span>
          <div>
            <p className="font-semibold text-slate-800">Need a larger daily limit?</p>
            <p className="mt-1 text-sm text-slate-500">Upgrade your plan to unlock more ads and lower withdrawal minimums.</p>
          </div>
        </div>
        <button onClick={() => onNavigate("plans")} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#a45c0c] hover:text-[#7e4404] sm:mt-0">
          Explore plans <Icon name="chevron" size={17} />
        </button>
      </section>
      
      {/* Account Information Section */}
      <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon name="users" size={19} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">Account Information</h2>
            <p className="text-sm text-slate-500">Your profile details and statistics</p>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Username</p>
            <p className="mt-1 font-semibold text-slate-800">{account.username}</p>
          </div>
          
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Email</p>
            <p className="mt-1 font-semibold text-slate-800">{account.email}</p>
          </div>
          
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Total Logins</p>
            <p className="mt-1 font-semibold text-slate-800">{account.loginHistory.length}</p>
          </div>
          
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">Member Since</p>
            <p className="mt-1 font-semibold text-slate-800">
              {account.loginHistory.length > 0 
                ? formatDate(account.loginHistory[account.loginHistory.length - 1].timestamp)
                : 'Today'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, helper, icon, accent, onClick }: { label: string; value: string; helper: string; icon: IconName; accent: string; onClick: () => void }) { return <button onClick={onClick} className="group rounded-2xl border border-slate-200/80 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/40"><div className="flex items-start justify-between"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}><Icon name={icon} size={19} /></span><span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#16816e]"><Icon name="arrow-right" size={17} /></span></div><p className="mt-5 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{value}</p><p className="mt-1.5 text-xs font-medium text-slate-400">{helper}</p></button>; }
function ActivityRow({ item }: { item: Account["activity"][number] }) { return <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.type === "withdraw" ? "bg-rose-50 text-rose-600" : item.type === "deposit" ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"}`}>{item.type === "withdraw" ? <Icon name="arrow-up" size={18} /> : item.type === "deposit" ? <Icon name="plus" size={18} /> : <Icon name="play" size={18} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 text-xs text-slate-400">{item.time}</p></div><span className={`text-sm font-bold ${item.amount < 0 ? "text-rose-600" : "text-[#16816e]"}`}>{item.amount < 0 ? "-" : "+"}{money(Math.abs(item.amount))}</span></div>; }

function AdsPage({ ads, remainingAds, limit, onWatch, onPlans, gamUnitPath, liveAdState, liveAdAction, onGamUnitChange, onSaveGamUnit, onRequestLiveAd }: { ads: Ad[]; remainingAds: number; limit: number; onWatch: (ad: Ad) => void; onPlans: () => void; gamUnitPath: string; liveAdState: LiveAdState; liveAdAction: (() => void) | null; onGamUnitChange: (value: string) => void; onSaveGamUnit: () => void; onRequestLiveAd: () => void }) { const liveButtonText = liveAdState === "requesting" ? "Loading live ad..." : liveAdState === "ready" ? "Start real ad" : liveAdState === "showing" ? "Ad playing" : "Load real ad"; return <div className="page-enter"><PageHeader eyebrow="Watch & earn" title="Today&apos;s ad opportunities" description="Use your approved Google Ad Manager rewarded unit for real ad delivery, or preview the front-end campaigns below." action={<div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm"><span className="font-bold text-[#126b5a]">{remainingAds} of {limit}</span><span className="ml-1 text-emerald-800/65">views left today</span></div>} /><section className="mb-7 overflow-hidden rounded-2xl border border-[#cfe8dc] bg-[#f5fbf7] p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div className="max-w-xl"><div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#124f46] text-white"><Icon name="play" size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#16816e]">Live inventory</p><h2 className="mt-0.5 text-lg font-semibold tracking-[-0.03em]">Google Ad Manager rewarded ad</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Add your approved rewarded ad-unit path, then load a real ad. Rs. 5 is credited only after Google&apos;s <strong className="font-semibold">rewardedSlotGranted</strong> event.</p><p className="mt-3 text-sm text-slate-500">For wallet or withdrawal help, contact <strong className="font-semibold text-slate-700">{supportNumber}</strong>.</p></div><div className="flex min-w-[240px] flex-col gap-2 sm:flex-row"><button onClick={liveAdState === "ready" ? liveAdAction ?? onRequestLiveAd : onRequestLiveAd} disabled={liveAdState === "requesting" || liveAdState === "showing" || remainingAds === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#124f46] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3d36] disabled:cursor-not-allowed disabled:bg-slate-300"><Icon name="play" size={16} /> {liveButtonText}</button>{liveAdState === "ready" && <span className="inline-flex items-center justify-center rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-[#126b5a]">Ready to play</span>}</div></div><div className="mt-5 grid gap-2 border-t border-[#d9eee3] pt-5 md:grid-cols-[minmax(0,1fr)_auto]"><label className="sr-only" htmlFor="gam-unit-path">Google Ad Manager rewarded unit path</label><input id="gam-unit-path" value={gamUnitPath} onChange={(event) => onGamUnitChange(event.target.value)} placeholder="/1234567/rewarded_ad_unit" className="w-full rounded-xl border border-[#c9e4d7] bg-white px-3.5 py-3 font-mono text-sm outline-none transition placeholder:font-sans focus:border-[#16816e] focus:ring-4 focus:ring-emerald-100" /><button onClick={onSaveGamUnit} className="rounded-xl border border-[#16816e] px-4 py-3 text-sm font-bold text-[#126b5a] transition hover:bg-emerald-100">Save live unit</button></div><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><span className="mt-0.5 text-[#16816e]"><Icon name="shield" size={14} /></span>Requires an approved Google Ad Manager rewarded ad unit and consent setup. Rewarded web ads are supported on mobile-optimized pages and may be blocked by ad blockers.</p></section><div className="mb-7 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f4ee] text-[#126b5a]"><Icon name="play" size={23} /><span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-[#92dc9d]" /></div><div><h2 className="font-semibold tracking-[-0.02em]">Your daily allowance</h2><p className="mt-1 text-sm text-slate-500">Watch up to {limit} verified ads. No points are added for skipped videos.</p></div></div><div className="mt-4 w-full sm:mt-0 sm:w-48"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-500"><span>Progress</span><span>{limit - remainingAds}/{limit}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#16816e] transition-all duration-700" style={{ width: `${((limit - remainingAds) / limit) * 100}%` }} /></div></div></div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.03em]">Demo sponsored campaigns</h2><span className="text-xs text-slate-400">Front-end preview</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{ads.map((ad) => <article key={ad.id} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"><div className={`relative h-36 overflow-hidden bg-gradient-to-br ${ad.colors} p-5 text-white`}><div className="absolute -right-6 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" /><div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-white/10" /><div className="relative flex h-full flex-col justify-between"><span className="w-fit rounded-md bg-black/15 px-2 py-1 text-[10px] font-bold tracking-[0.14em]">DEMO</span><p className="text-lg font-bold tracking-[-0.04em]">{ad.brand}</p></div></div><div className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{ad.category}</span><span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><Icon name="clock" size={14} /> {ad.duration}</span></div><h2 className="mt-3 min-h-12 text-base font-semibold leading-6 tracking-[-0.02em] text-slate-800">{ad.title}</h2><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Preview reward</p><p className="mt-0.5 text-base font-bold text-[#16816e]">+{money(ad.reward)}</p></div><button onClick={() => onWatch(ad)} disabled={remainingAds === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-[#124f46] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b3d36] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">Preview flow <Icon name="play" size={15} /></button></div></div></article>)}</div>{remainingAds === 0 && <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-lg font-semibold">You reached today&apos;s viewing limit.</p><p className="mt-1 text-sm text-slate-400">Upgrade for more verified ads and a lower withdrawal minimum.</p></div><button onClick={onPlans} className="rounded-xl bg-[#97e2a2] px-4 py-3 text-sm font-bold text-[#0d463d] transition hover:bg-[#b1edba]">Compare plans</button></div>}<p className="mt-8 flex items-center gap-2 text-xs leading-5 text-slate-400"><Icon name="info" size={15} /> Demo campaigns remain for interface testing. Real delivery is handled by your saved Google Ad Manager unit.</p></div>; }

function WalletPage({ account, plan, onDeposit, onWithdraw }: { account: Account; plan: (typeof plans)[PlanId]; onDeposit: () => void; onWithdraw: () => void }) { 
  const pendingTransactions = account.pendingTransactions.filter(t => t.status === "pending");
  
  return <div className="page-enter"><PageHeader eyebrow="Wallet" title="Your earnings and transactions" description="Track ad rewards, deposit funds, and request withdrawals via Easypaisa or JazzCash." action={<button onClick={onDeposit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700"><Icon name="plus" size={17} /> Add funds</button>} /><section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start"><div><p className="text-sm font-medium text-blue-100/75">Available balance</p><p className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{money(account.balance)}</p><p className="mt-3 text-sm text-blue-100/65">Earn Rs. {plan.perAdPrice} per ad. Minimum withdrawal: Rs. {plan.minWithdrawal}</p></div><div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-100/60">Active plan</p><p className="mt-1 text-base font-semibold">{plan.name}</p><p className="mt-1 text-xs text-blue-100/60">Rs. {plan.perAdPrice} per ad</p></div></div><div className="mt-9 grid gap-3 sm:grid-cols-2"><button onClick={onWithdraw} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3.5 text-sm font-bold text-white transition hover:from-green-600 hover:to-emerald-600"><Icon name="arrow-up" size={17} /> Withdraw funds</button><button onClick={onDeposit} className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"><Icon name="plus" size={17} /> Deposit balance</button></div></section>

  {pendingTransactions.length > 0 && (
    <section className="mt-7">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Icon name="clock" size={19} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">Pending Transactions</h2>
            <p className="mt-1 text-sm text-amber-800">You have {pendingTransactions.length} transaction(s) waiting for admin approval.</p>
            <div className="mt-3 space-y-2">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {transaction.type === "deposit" ? "Deposit" : "Withdrawal"} of {money(transaction.amount)}
                    </p>
                    <p className="text-xs text-slate-500">Via {transaction.method} • Transaction ID: {transaction.id}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )}

<section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-[-0.03em]">Transaction history</h2>
      <p className="mt-1 text-sm text-slate-500">Latest earning, deposit and withdrawal activity.</p>
    </div>
    <div className="divide-y divide-slate-100">
      {account.activity.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            item.type === "withdraw" || item.type === "pending_withdraw" ? "bg-rose-50 text-rose-600" : 
            item.type === "deposit" || item.type === "pending_deposit" ? "bg-sky-50 text-sky-600" : 
            "bg-emerald-50 text-emerald-600"
          }`}>
            {item.type === "withdraw" || item.type === "pending_withdraw" ? <Icon name="arrow-up" size={18} /> : 
             item.type === "deposit" || item.type === "pending_deposit" ? <Icon name="plus" size={18} /> : 
             <Icon name="play" size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{item.time}</p>
          </div>
          <span className={`text-sm font-bold ${
            item.type === "pending_deposit" || item.type === "pending_withdraw" ? "text-amber-600" :
            item.amount < 0 ? "text-rose-600" : "text-[#16816e]"
          }`}>
            {item.type === "pending_deposit" || item.type === "pending_withdraw" ? "Pending" : 
             item.amount < 0 ? "-" : "+"}{money(Math.abs(item.amount))}
          </span>
        </div>
      ))}
    </div>
  </div>

<div className="rounded-2xl border border-slate-200/80 bg-white p-6">
  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
    <Icon name="info" size={19} />
  </span>
  <h2 className="mt-5 text-lg font-semibold tracking-[-0.03em]">Withdrawal information</h2>
  <p className="mt-2 text-sm leading-6 text-slate-500">Your current <span className="font-semibold text-slate-700">{plan.name}</span> plan allows withdrawal requests from <span className="font-semibold text-slate-700">{money(plan.minWithdrawal)}</span>.</p>
  <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">Withdrawal methods: <strong className="text-blue-600">Easypaisa</strong> and <strong className="text-blue-600">JazzCash</strong>. Send screenshot to customer service.</p>
  <div className="mt-6 rounded-xl bg-slate-50 p-4">
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Icon name="shield" size={14} />
      </span>
      <p className="text-sm text-slate-700">
        <strong>Payment Process:</strong> After submitting a deposit or withdrawal request, you'll need to upload a screenshot of your payment. Admin will review and approve within 24 hours.
      </p>
    </div>
  </div>
</div>
</section>
</div>; }

function ReferralsPage({ referrals, qualifiedReferrals, earnings, inviteName, inviteEmail, onNameChange, onEmailChange, onInvite, onCopy, onQualify }: { referrals: Referral[]; qualifiedReferrals: number; earnings: number; inviteName: string; inviteEmail: string; onNameChange: (value: string) => void; onEmailChange: (value: string) => void; onInvite: (event: FormEvent) => void; onCopy: () => void; onQualify: (id: number) => void }) { return <div className="page-enter"><PageHeader eyebrow="Referral program" title="Invite friends, grow together" description="You receive Rs. 20 when an invited member completes their first two ads." /><section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]"><div className="overflow-hidden rounded-2xl bg-[#124f46] p-6 text-white sm:p-8"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#b5efbd]"><Icon name="gift" size={22} /></span><h2 className="mt-7 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em]">Share the link. Earn when they get started.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-emerald-100/70">Your reward unlocks automatically after a friend watches their second ad.</p><div className="mt-7 flex rounded-xl bg-white p-1.5"><code className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-slate-600">gemstar.com/invite/GEMSTAR786</code><button onClick={onCopy} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#124f46] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3d36]"><Icon name="copy" size={16} /><span className="hidden sm:inline">Copy</span></button></div></div><form onSubmit={onInvite} className="rounded-2xl border border-slate-200/80 bg-white p-6"><h2 className="text-lg font-semibold tracking-[-0.03em]">Send an invite</h2><p className="mt-1 text-sm text-slate-500">Create an invite in your referral list.</p><label className="mt-5 block text-sm font-medium text-slate-700">Friend&apos;s name<input value={inviteName} onChange={(event) => onNameChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#16816e] focus:ring-4 focus:ring-emerald-100" placeholder="e.g. Noor Ahmed" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Email address<input value={inviteEmail} onChange={(event) => onEmailChange(event.target.value)} type="email" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#16816e] focus:ring-4 focus:ring-emerald-100" placeholder="friend@example.com" /></label><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#124f46] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3d36]"><Icon name="send" size={16} /> Create invite</button></form></section><section className="mt-7 grid gap-4 sm:grid-cols-3"><SmallStat label="Total invited" value={String(referrals.length)} icon="users" color="bg-sky-50 text-sky-700" /><SmallStat label="Qualified friends" value={String(qualifiedReferrals)} icon="check" color="bg-emerald-50 text-emerald-700" /><SmallStat label="Referral earnings" value={money(earnings)} icon="gift" color="bg-amber-50 text-amber-700" /></section>
{/* <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h2 className="text-lg font-semibold tracking-[-0.03em]">Your referrals</h2><p className="mt-1 text-sm text-slate-500">Track eligibility and referral rewards.</p></div><span className="text-xs font-medium text-slate-400">Reward unlock: 2 ads watched</span></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-6 py-3.5">Member</th><th className="px-4 py-3.5">Joined</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5 text-right">Reward</th><th className="px-6 py-3.5" /></tr></thead><tbody className="divide-y divide-slate-100">{referrals.map((referral) => <tr key={referral.id} className="text-sm"><td className="px-6 py-4"><p className="font-semibold text-slate-800">{referral.name}</p><p className="mt-0.5 text-xs text-slate-400">{referral.email}</p></td><td className="px-4 py-4 text-slate-500">{referral.joined}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(referral.status)}`}>{referral.status}</span></td><td className="px-4 py-4 text-right font-bold text-[#16816e]">{referral.reward ? `+${money(referral.reward)}` : "-"}</td><td className="px-6 py-4 text-right">{referral.status !== "Qualified" && <button onClick={() => onQualify(referral.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#16816e] transition hover:bg-emerald-50">Mark qualified</button>}</td></tr>)}</tbody></table></div></section> */}
</div>; }

function AdminPanel({ account, onApproveTransaction }: { account: Account; onApproveTransaction: (id: number) => void }) {
  const pendingTransactions = account.pendingTransactions.filter(t => t.status === "pending");
  
  return (
    <div className="page-enter">
      <PageHeader 
        eyebrow="Admin Panel" 
        title="Transaction Management" 
        description="Review and approve pending deposits and withdrawals." 
      />
      
      {pendingTransactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 text-green-600 mx-auto">
            <Icon name="check" size={24} />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">No Pending Transactions</h2>
          <p className="mt-2 text-sm text-slate-500">All transactions have been processed.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.03em]">Pending Transactions ({pendingTransactions.length})</h2>
            <p className="mt-1 text-sm text-slate-500">Review and approve transactions submitted by users.</p>
          </div>
          
          <div className="divide-y divide-slate-100">
            {pendingTransactions.map((transaction) => (
              <div key={transaction.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                        transaction.type === "deposit" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                      }`}>
                        <Icon name={transaction.type === "deposit" ? "plus" : "arrow-up"} size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {transaction.type === "deposit" ? "Deposit" : "Withdrawal"} - {money(transaction.amount)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Method: {transaction.method} • ID: {transaction.id} • 
                          Submitted: {new Date(transaction.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onApproveTransaction(transaction.id)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Admin Instructions</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-blue-600"><Icon name="check" size={16} /></span>
            Verify the payment screenshot before approving deposits
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600"><Icon name="check" size={16} /></span>
            Ensure user has sufficient balance before approving withdrawals
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600"><Icon name="check" size={16} /></span>
            Contact customer service at {supportNumber} for any issues
          </li>
        </ul>
      </div>
    </div>
  );
}
function SmallStat({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: string }) { return <div className="rounded-2xl border border-slate-200/80 bg-white p-5"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon name={icon} size={18} /></span><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{value}</p></div>; }

function PlansPage({ activePlan, onChoose }: { activePlan: PlanId; onChoose: (id: PlanId) => void }) { const planList = useMemo(() => [plans.free, plans.standard, plans.premium, plans["premium-pro"]], []); return <div className="page-enter"><PageHeader eyebrow="Membership plans" title="Choose your earning pace" description="Every plan sets your daily ad allowance, per-ad earnings, and withdrawal minimum." /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{planList.map((plan) => <article key={plan.id} className={`relative flex min-h-[440px] flex-col rounded-2xl border p-6 ${plan.highlighted ? "border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-950/15" : "border-slate-200/80 bg-white text-slate-900"}`}>{plan.highlighted && <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-white">Best value</span>}<div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlighted ? "bg-white/10 text-blue-100" : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600"}`}><Icon name="crown" size={19} /></span>{activePlan === plan.id && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${plan.highlighted ? "bg-white/15 text-white" : "bg-blue-50 text-blue-600"}`}>Active</span>}</div><h2 className="mt-6 text-xl font-semibold tracking-[-0.035em]">{plan.name}</h2><p className={`mt-2 min-h-10 text-sm leading-5 ${plan.highlighted ? "text-blue-100/70" : "text-slate-500"}`}>{plan.description}</p><div className="mt-6"><span className="text-3xl font-semibold tracking-[-0.05em]">{plan.price === 0 ? "Free" : money(plan.price)}</span>{plan.price > 0 && <span className={plan.highlighted ? "text-blue-100/60" : "text-slate-400"}> / activation</span>}</div><ul className={`mt-6 space-y-3 border-t pt-5 text-sm ${plan.highlighted ? "border-white/10 text-blue-50" : "border-slate-100 text-slate-600"}`}><li className="flex gap-2"><span className={plan.highlighted ? "text-blue-100" : "text-blue-600"}><Icon name="check" size={17} stroke={2.5} /></span>{plan.dailyLimit} ads each day</li><li className="flex gap-2"><span className={plan.highlighted ? "text-blue-100" : "text-blue-600"}><Icon name="check" size={17} stroke={2.5} /></span>Rs. {plan.perAdPrice} per ad</li><li className="flex gap-2"><span className={plan.highlighted ? "text-blue-100" : "text-blue-600"}><Icon name="check" size={17} stroke={2.5} /></span>Withdraw from {money(plan.minWithdrawal)}</li></ul><button onClick={() => onChoose(plan.id)} disabled={activePlan === plan.id} className={`mt-auto w-full rounded-xl px-4 py-3 text-sm font-bold transition ${plan.highlighted ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"} disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400`}>{activePlan === plan.id ? "Current plan" : plan.price === 0 ? "Switch to Free" : `Activate for ${money(plan.price)}`}</button></article>)}</div><div className="mt-8 flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 text-sm leading-6 text-slate-500"><span className="mt-0.5 text-blue-600"><Icon name="shield" size={19} /></span><p><strong className="text-slate-700">Front-end checkout:</strong> activating a plan is simulated in this demo. Your selected plan and daily limit are safely retained in this browser.</p></div></div>; }

function Overlay({ children }: { children: React.ReactNode }) { 
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  ); 
}
function WatchModal({ ad, onComplete, onClose }: { ad: Ad; onComplete: () => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setHasError(true));
    else video.pause();
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function stopAndClose() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    onClose();
  }

  function retryVideo() {
    const video = videoRef.current;
    if (!video) return;
    setHasError(false);
    video.load();
    video.play().catch(() => setHasError(true));
  }

  return <Overlay><div className="modal-enter w-full max-w-2xl overflow-hidden rounded-2xl bg-[#0a1614] shadow-2xl">
    <div className="relative aspect-video overflow-hidden bg-slate-950">
      <video ref={videoRef} src={ad.videoUrl} poster={ad.posterUrl} autoPlay muted playsInline preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={(event) => { const { currentTime, duration } = event.currentTarget; setProgress(duration ? Math.min((currentTime / duration) * 100, 100) : 0); }} onEnded={onComplete} onError={() => setHasError(true)} className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30" />
      <div className="absolute left-4 top-4 flex items-center gap-2"><span className="rounded-md bg-black/45 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-white backdrop-blur">VIDEO AD</span><span className="rounded-md bg-emerald-400/90 px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-[#0d463d]">+{money(ad.reward)}</span></div>
      <button onClick={stopAndClose} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/45 text-white backdrop-blur transition hover:bg-rose-500" aria-label="Close video ad"><Icon name="x" size={19} /></button>
      {hasError && <div className="absolute inset-0 grid place-items-center bg-slate-950/80 p-6 text-center text-white"><div><p className="text-lg font-semibold">Video could not load</p><p className="mt-2 text-sm text-slate-300">Check your connection, then try the video again.</p><div className="mt-5 flex justify-center gap-3"><button onClick={retryVideo} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">Retry video</button><button onClick={stopAndClose} className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold">Close</button></div></div></div>}
      {!hasError && <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5"><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-200" style={{ width: `${progress}%` }} /></div><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.15em] text-emerald-100/70">NOW PLAYING</p><p className="mt-1 text-base font-semibold text-white sm:text-lg">{ad.brand}</p></div><div className="flex items-center gap-2"><button onClick={toggleMuted} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur transition hover:bg-white/25" aria-label={isMuted ? "Turn sound on" : "Mute video"}>{isMuted ? <Icon name="volume-off" size={18} /> : <Icon name="volume" size={18} />}</button><button onClick={togglePlayback} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#124f46] transition hover:bg-emerald-100" aria-label={isPlaying ? "Pause video" : "Play video"}>{isPlaying ? <Icon name="pause" size={18} stroke={2.4} /> : <Icon name="play" size={18} />}</button><button onClick={stopAndClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600" aria-label="Stop and close video"><Icon name="stop" size={16} /></button></div></div></div>}
    </div>
    <div className="flex flex-col gap-2 bg-white px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="font-semibold text-slate-800">Watch the complete video to receive <span className="text-[#16816e]">{money(ad.reward)}</span>.</p><p className="text-xs text-slate-400">Close or stop ends the viewing session.</p></div>
  </div></Overlay>;
}
function PlanModal({ plan, onClose, onConfirm }: { plan: (typeof plans)[PlanId]; onClose: () => void; onConfirm: () => void }) { 
  return (
    <Overlay>
      <div className="modal-enter w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600">
            <Icon name="crown" size={20} />
          </span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">Activate {plan.name}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          This demo will activate your plan immediately and update your daily ad allowance.
        </p>
        
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Plan activation</span>
            <strong>{plan.price ? money(plan.price) : "Free"}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="text-slate-500">Daily ads</span>
            <strong>{plan.dailyLimit} ads</strong>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="text-slate-500">Earnings per ad</span>
            <strong>Rs. {plan.perAdPrice}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Minimum withdrawal</span>
            <strong>{money(plan.minWithdrawal)}</strong>
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700">
            Confirm plan
          </button>
        </div>
      </div>
    </Overlay>
  ); 
}
function DepositModal({ amount, onAmountChange, onClose, onSubmit }: { amount: string; onAmountChange: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) { 
  return (
    <Overlay>
      <form onSubmit={onSubmit} className="modal-enter w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600">
            <Icon name="plus" size={20} />
          </span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">Deposit Wallet Funds</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          Minimum deposit: Rs. 300. Send screenshot to {supportNumber}.
        </p>
        
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[300, 500, 1000].map((value) => (
            <button 
              type="button" 
              key={value} 
              onClick={() => onAmountChange(String(value))}
              className={`rounded-lg border px-2.5 py-2 text-sm font-bold transition ${
                Number(amount) === value 
                  ? "border-blue-600 bg-blue-50 text-blue-600" 
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {money(value)}
            </button>
          ))}
        </div>
        
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Custom amount
          <input 
            value={amount} 
            onChange={(event) => onAmountChange(event.target.value)} 
            inputMode="numeric" 
            placeholder="Minimum Rs. 300" 
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" 
          />
        </label>
        
        <button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700">
          Deposit {money(Number(amount) || 0)} 
          <Icon name="arrow-right" size={16} />
        </button>
      </form>
    </Overlay>
  ); 
}
function WithdrawModal({ plan, amount, method, onAmountChange, onMethodChange, onClose, onSubmit }: { plan: (typeof plans)[PlanId]; amount: string; method: string; onAmountChange: (value: string) => void; onMethodChange: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) { 
  return (
    <Overlay>
      <form onSubmit={onSubmit} className="modal-enter w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600">
            <Icon name="arrow-up" size={20} />
          </span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">Withdraw your balance</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          {plan.name} members can request from {money(plan.minWithdrawal)}. 
          Send screenshot to {supportNumber}.
        </p>
        
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Amount
          <input 
            value={amount} 
            onChange={(event) => onAmountChange(event.target.value)} 
            inputMode="decimal" 
            placeholder={`Minimum ${money(plan.minWithdrawal)}`} 
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" 
          />
        </label>
        
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Send to
          <select 
            value={method} 
            onChange={(event) => onMethodChange(event.target.value)} 
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option>Easypaisa</option>
            <option>JazzCash</option>
          </select>
        </label>
        
        <button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700">
          Create withdrawal request 
          <Icon name="arrow-right" size={16} />
        </button>
      </form>
    </Overlay>
  ); 
}

function PaymentOptionsModal({ 
  type, 
  amount, 
  selectedMethod, 
  screenshotFile, 
  uploading, 
  onMethodChange, 
  onScreenshotUpload, 
  onSubmit, 
  onClose 
}: { 
  type: "deposit" | "withdraw"; 
  amount: number; 
  selectedMethod: string; 
  screenshotFile: File | null; 
  uploading: boolean; 
  onMethodChange: (method: string) => void; 
  onScreenshotUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; 
  onSubmit: () => void; 
  onClose: () => void; 
}) {
  const paymentMethods = [
    { id: "JazzCash", name: "JazzCash", number: "+92 348 0103280" },
    { id: "Easypaisa", name: "Easypaisa", number: "+92 348 0103280" },
    { id: "BankTransfer", name: "Bank Transfer", number: "Account: 123456789, Bank: Habib Bank" },
  ];

  return (
    <Overlay>
      <div className="modal-enter w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600">
            <Icon name={type === "deposit" ? "plus" : "arrow-up"} size={20} />
          </span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.04em]">
          {type === "deposit" ? "Complete Deposit" : "Complete Withdrawal"}
        </h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          {type === "deposit" 
            ? `Deposit amount: ${money(amount)}. Send payment and upload screenshot.`
            : `Withdrawal amount: ${money(amount)}. Choose method and upload screenshot.`
          }
        </p>

        <div className="mt-4">
          <h3 className="text-base font-semibold tracking-[-0.03em]">Payment Methods</h3>
          <div className="mt-2 space-y-2">
            {paymentMethods.map((method) => (
              <div 
                key={method.id}
                className={`rounded-lg border p-3 transition cursor-pointer ${selectedMethod === method.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                onClick={() => onMethodChange(method.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{method.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600 truncate">{method.number}</p>
                  </div>
                  {selectedMethod === method.id && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white ml-2 flex-shrink-0">
                      <Icon name="check" size={10} stroke={3} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-semibold tracking-[-0.03em]">Upload Screenshot</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Upload {type === "deposit" ? "payment confirmation" : "withdrawal request"} screenshot
          </p>
          
          <div className="mt-2">
            {screenshotFile ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
                      <Icon name="check" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate text-sm">{screenshotFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(screenshotFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => onScreenshotUpload({ target: { files: [] } } as any)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 flex-shrink-0 ml-2"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-blue-400 hover:bg-blue-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Icon name="plus" size={20} />
                  </span>
                  <p className="mt-2 font-semibold text-slate-700 text-sm">Upload Screenshot</p>
                  <p className="mt-0.5 text-xs text-slate-500">JPG, PNG or PDF up to 5MB</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={onScreenshotUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button 
            type="button" 
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onSubmit}
            disabled={!screenshotFile || uploading}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {uploading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Uploading...
              </>
            ) : (
              <>
                {type === "deposit" ? "Submit Deposit" : "Submit Withdrawal"}
                <Icon name="arrow-right" size={16} />
              </>
            )}
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 mt-0.5">
              <Icon name="info" size={12} />
            </span>
            <p className="text-xs text-amber-800">
              <strong>Important:</strong> After upload, admin will review. Contact {supportNumber} for help.
            </p>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
