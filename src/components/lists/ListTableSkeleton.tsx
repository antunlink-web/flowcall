import { Skeleton } from "@/components/ui/skeleton";

export function ListTableSkeleton() {
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">List Name</th>
            <th className="text-center p-3 font-medium">Total</th>
            <th className="text-center p-3 font-medium">New</th>
            <th className="text-center p-3 font-medium">Call back</th>
            <th className="text-center p-3 font-medium">Won</th>
            <th className="text-center p-3 font-medium">Lost</th>
            <th className="text-left p-3 font-medium">Created</th>
            <th className="text-right p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-3">
                <Skeleton className="h-5 w-32" />
              </td>
              <td className="p-3 text-center">
                <Skeleton className="h-5 w-12 mx-auto rounded-full" />
              </td>
              <td className="p-3 text-center">
                <Skeleton className="h-5 w-12 mx-auto rounded-full" />
              </td>
              <td className="p-3 text-center">
                <Skeleton className="h-5 w-12 mx-auto rounded-full" />
              </td>
              <td className="p-3 text-center">
                <Skeleton className="h-5 w-12 mx-auto rounded-full" />
              </td>
              <td className="p-3 text-center">
                <Skeleton className="h-5 w-12 mx-auto rounded-full" />
              </td>
              <td className="p-3">
                <Skeleton className="h-5 w-20" />
              </td>
              <td className="p-3 text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
