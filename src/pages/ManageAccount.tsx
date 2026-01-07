import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Palette,
  Wallet,
  Users,
  ShoppingCart,
  PiggyBank,
  Receipt,
  ChevronRight,
} from "lucide-react";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Pipeline", href: "/manage/pipeline" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/manage/settings" },
  { label: "Account", href: "/manage/account" },
];

const sidebarItems = [
  { icon: CreditCard, label: "Billing Information", id: "billing" },
  { icon: Palette, label: "Custom Branding", id: "branding" },
  { icon: Wallet, label: "Payment Method", id: "payment" },
  { icon: Users, label: "Seats", id: "seats" },
  { icon: ShoppingCart, label: "Subscription", id: "subscription" },
  { icon: PiggyBank, label: "Balance", id: "balance" },
  { icon: Receipt, label: "Invoices", id: "invoices" },
];

const mockInvoices = [
  { date: "5 January 2026", amount: "€105.74", transactionId: "6p5ayg0b" },
  { date: "8 December 2025", amount: "€24.23", transactionId: "rr8nsvgh" },
  { date: "5 December 2025", amount: "€150.00", transactionId: "0rfksbjk" },
  { date: "18 November 2025", amount: "€15.87", transactionId: "cbkann6z" },
  { date: "11 November 2025", amount: "€21.70", transactionId: "g6z5hwwz" },
  { date: "5 November 2025", amount: "€80.61", transactionId: "5dqkb6j5" },
  { date: "13 October 2025", amount: "€20.19", transactionId: "ea2h9f78" },
  { date: "13 October 2025", amount: "€20.19", transactionId: "3a81b297" },
];

const mockBalanceHistory = [
  { timestamp: "07-01-2026 15:45", description: "Credited: Removed seat from Basic (Legacy 2025-12) Plan subscription", amount: "€24.2300", balance: "€24.2300" },
];

export default function ManageAccount() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("seats");
  const [seats, setSeats] = useState("4");
  const [topUpTo, setTopUpTo] = useState("0");
  const [balanceFallsBelow, setBalanceFallsBelow] = useState("0");
  const [showEntries, setShowEntries] = useState("25");
  const [searchInvoices, setSearchInvoices] = useState("");

  const accountInfo = {
    plan: "Basic (Legacy 2025-12) - Billed €25 monthly per user",
    nextBillingDate: "Saturday, 7 February 2026",
    nextBillingAmount: "€100.00",
    paymentMethod: "535550******6227 / 06-2027",
    accountBalance: "€24.23",
  };

  const renderAccountInfoCard = () => (
    <div className="border border-blue-200 bg-blue-50/50 rounded p-6 mb-8">
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Your current plan:</span>
          <span>{accountInfo.plan}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Next billing date:</span>
          <span>{accountInfo.nextBillingDate}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Next billing amount:</span>
          <span>{accountInfo.nextBillingAmount}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Payment method:</span>
          <span>{accountInfo.paymentMethod}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Account Balance:</span>
          <span>{accountInfo.accountBalance}</span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "seats":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Seats</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="text-center mb-6">
              <p className="text-xl">
                You currently have <span className="font-bold text-primary">4</span> users and <span className="font-bold text-primary">0</span> available seats.
              </p>
            </div>

            <div className="mb-6">
              <div className="bg-green-500 text-white text-center py-2 rounded">
                4 Used
              </div>
            </div>

            <div className="border border-border rounded p-6 space-y-4">
              <p className="text-muted-foreground">
                Adjust your number of seats to enable inviting more users. Upon adjusting we will charge or credit your account accordingly.
              </p>
              <p className="text-sm">
                <span className="text-primary">If</span> you intend to remove seats you may want to delete some users from the{" "}
                <Link to="/manage/users" className="text-primary underline">user management section</Link> first.
              </p>

              <div className="flex items-center gap-4 pt-4">
                <Label>Seats</Label>
                <Input
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="w-20"
                  type="number"
                />
                <Button className="bg-destructive hover:bg-destructive/90">Submit</Button>
              </div>
            </div>
          </div>
        );

      case "subscription":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Subscription</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>You can upgrade your plan at any time, including upgrading from monthly to annually payment. Your account will be prorated the remainder of the current subscription before charging for the new one.</p>
              <p>If you want to downgrade, you will continue on the current plan for the remainder of the subscription period, and then the system will switch to the selected plan.</p>
              <p>Your current subscription period runs until <span className="text-primary underline">Saturday, 7 February 2026</span>.</p>
              <p>If you wish to change your plan, please do so below.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Available plans</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="grid grid-cols-3 gap-6">
                {/* Basic Plan */}
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">BASIC</h3>
                    <p className="text-sm opacity-80">The Startup Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€27</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Premium support</li>
                      <li className="border-t pt-3">Duplicate detection</li>
                      <li className="border-t pt-3">Email integration</li>
                      <li className="border-t pt-3">Pipeline automation</li>
                      <li className="border-t pt-3">Power Dialer (rates apply)</li>
                      <li className="border-t pt-3">SMS integration</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>

                {/* Plus Plan */}
                <div className="border-2 border-slate-600 rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">PLUS</h3>
                    <p className="text-sm opacity-80">The Scaleup Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€38</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <p className="text-sm mb-4">Everything from Basic</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Bulk deduplication</li>
                      <li className="border-t pt-3">Campaign-wide CIDs</li>
                      <li className="border-t pt-3">Inbound calls</li>
                      <li className="border-t pt-3">Lead recycling</li>
                      <li className="border-t pt-3">Smart caller ID management</li>
                      <li className="border-t pt-3">Time tracking</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-white text-slate-600 text-center py-4 border-b">
                    <h3 className="font-bold text-lg">PREMIUM</h3>
                    <p className="text-sm text-green-600">The Agency Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€59</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <p className="text-sm mb-4">Everything from Plus</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Callcenter tools</li>
                      <li className="border-t pt-3">Client silos/subaccounts</li>
                      <li className="border-t pt-3">Custom branding</li>
                      <li className="border-t pt-3">Live monitoring and training</li>
                      <li className="border-t pt-3">White-label add-on</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Add-ons</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="max-w-md mx-auto">
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">PRIORITY SUPPORT</h3>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€59</span>
                      <span className="text-sm text-muted-foreground"> per month</span>
                    </div>
                    <p className="text-sm mb-4">With Priority Support, you're our top priority</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Quick Resolutions: Speed up problem-solving</li>
                      <li className="border-t pt-3">Peace of Mind: Help is always a moment away</li>
                      <li className="border-t pt-3">Convenience at Your Fingertips: Enjoy hassle-free support</li>
                    </ul>
                    <Button className="mt-6 bg-green-600 hover:bg-green-700 w-full">Enable</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel Subscription */}
            <div>
              <h2 className="text-xl font-medium text-primary italic mb-2">Cancel subscription</h2>
              <div className="w-16 h-0.5 bg-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                If you wish to cancel your subscription, please{" "}
                <span className="text-primary underline cursor-pointer">do so here</span>.
              </p>
            </div>
          </div>
        );

      case "balance":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Balance</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="text-center mb-6">
              <p className="text-2xl">Your balance: <span className="text-primary">{accountInfo.accountBalance}</span></p>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>We keep track of your account balance when you add or remove seats, make calls with Myphoner Voice etc.</p>
              <p>Adjust these settings so they fit your usage to make sure your agents can always make calls with Myphoner Voice.</p>
              <p>We recommend having a minimum balance of €5.00 per active agent at all times.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">When to top up your balance</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="border border-border rounded p-6 space-y-6">
                <p className="text-sm">
                  You <span className="font-bold">only</span> need to add credits to your balance if you are using Myphoner Voice.
                </p>
                <p className="text-sm">
                  If you are using Myphoner Voice, we recommend for your account to top up to <span className="font-bold">€40.00</span> when balance falls below <span className="font-bold">€20.00</span>.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label>Top up to</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground">€</span>
                      <Input
                        value={topUpTo}
                        onChange={(e) => setTopUpTo(e.target.value)}
                        className="max-w-xs"
                        type="number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>When balance falls below</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground">€</span>
                      <Input
                        value={balanceFallsBelow}
                        onChange={(e) => setBalanceFallsBelow(e.target.value)}
                        className="max-w-xs"
                        type="number"
                      />
                    </div>
                  </div>

                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">How we calculated your balance</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBalanceHistory.map((item, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-3 text-sm">{item.timestamp}</td>
                        <td className="p-3 text-sm text-primary">{item.description}</td>
                        <td className="p-3 text-sm text-right">{item.amount}</td>
                        <td className="p-3 text-sm text-right">{item.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "invoices":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Invoices</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Show</span>
                <Select value={showEntries} onValueChange={setShowEntries}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm">entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Search:</span>
                <Input
                  value={searchInvoices}
                  onChange={(e) => setSearchInvoices(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Transaction ID</th>
                    <th className="text-right p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockInvoices.map((invoice, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-3 text-sm text-primary">{invoice.date}</td>
                      <td className="p-3 text-sm">{invoice.amount}</td>
                      <td className="p-3 text-sm text-primary">{invoice.transactionId}</td>
                      <td className="p-3 text-sm text-right">
                        <span className="text-primary cursor-pointer hover:underline">View/print invoice</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing 1 to {mockInvoices.length} of {mockInvoices.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="default" size="sm" className="bg-destructive hover:bg-destructive/90">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground py-12">
            <p>Select a section from the sidebar</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {/* Sub Navigation */}
      <div className="border-b border-border bg-background">
        <div className="flex gap-6 px-6">
          {subNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                location.pathname === item.href
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-background">
          <nav className="p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm transition-colors ${
                  activeSection === item.id
                    ? "text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${activeSection === item.id ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeSection === item.id ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
