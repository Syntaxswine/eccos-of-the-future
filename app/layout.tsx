import type { Metadata } from "next";
import "./sites.css";

export const metadata: Metadata = {
  title: "ECCOS / TRANSMISSION 001",
  description: "A pattern has repeated. The next difference is yours."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
