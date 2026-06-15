import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Show, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: Promise<{
        courseId: string;
    }>;
}

export default async function CoursePage({ params }: PageProps) {
    const { courseId } = await params;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const course = await convex.query(api.courses.getCourseById,
        {
            courseId: courseId as any,
        }
    );

    if (!course) {
        return <div>Course not found</div>;
    }

    return (
        <Card className='flex flex-col'>
            <Link href={`/courses/${course._id}`} className='cursor-pointer'>
                <CardHeader>
                    <Image
                        src={course.imageUrl}
                        alt={course.title}
                        width={640}
                        height={360}
                        className='rounded-md object-cover'
                    />
                </CardHeader>
                <CardContent className='flex-grow'>
                    <CardTitle className='text-xl mb-2 hover:underline'>{course.title}</CardTitle>
                </CardContent>
            </Link>

            <CardFooter className='flex justify-between items-center'>
                <Badge variant='default' className='text-lg px-3 py-1'>
                    ${course.price.toFixed(2)}
                </Badge>
                <Show when={'signed-in'}>
                    {/* <PurchaseButton courseId={course._id} /> */}
                    pruches button
                </Show>
                <Show when={'signed-out'}>
                    <SignInButton mode='modal'>
                        <Button variant='outline'>Enroll Now</Button>
                    </SignInButton>
                </Show>

            </CardFooter>
        </Card>
    );
}