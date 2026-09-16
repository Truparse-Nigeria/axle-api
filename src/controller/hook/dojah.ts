import { catchAsync } from "@/middleware";

export const dojahHook = catchAsync(async (req, res) => {
    console.log("dojah hook", req.body);
});