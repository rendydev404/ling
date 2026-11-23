import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace Gate",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function InternalGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
