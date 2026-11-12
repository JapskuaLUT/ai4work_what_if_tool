# Yard logistics tutorial — narration script

Narrated by the Kokoro voice `af_heart` (local text-to-speech). Each section is one scene of the video, in order; timings are in seconds from the start of the video.

## 1. Yard logistics

_title scene · 0s–13s_

Welcome. In the next few minutes you'll learn to use the yard logistics view of the What-If Tool: compare simulator runs, find where trucks lose time, and let the AI assistant draft improvements.

## 2. From simulator runs to clear answers

_points scene · 13s–26s_

The tool doesn't simulate the yard. It reads runs from the yard simulator, compares them side by side, shows where trucks waited, and lets a local AI draft and discuss fixes.

## 3. Step 1 · Open the yard case

_screen scene · 26s–41s_

From the home page, click Load Yard Simulation. At the top is a map of the yard: the check-in terminal at the gate, parking, the scale, and twenty-five storage silos. Remember the check-in terminal, LT010.

## 4. Step 2 · Compare the runs

_screen scene · 41s–59s_

The Comparison tab puts every run side by side. With thirty trucks, nobody waits. With fifty-two, the longest wait is six minutes. With seventy-one, it jumps to three hours and thirty-six minutes. Click Select to star the run you prefer.

## 5. Step 3 · Find the bottleneck

_screen scene · 59s–74s_

Open the WaitingProblem tab. The top bottleneck is off-yard waiting: three trucks queuing outside the gate for one check-in slot. So the fix is check-in capacity or spacing out arrivals, not a bigger gate.

## 6. Click a bottleneck to see when it overflowed

_screen scene · 74s–85s_

Click any bottleneck, like LT010, and the chart shows how many trucks were there, minute by minute, against its capacity: the red dashed line.

## 7. Step 4 · See each truck’s day

_screen scene · 85s–99s_

Further down, the per-truck timeline gives every truck one row, and red means waiting. Hover a row for its totals. This truck waited three hours and thirty-six minutes: eighty-three percent of its whole visit.

## 8. Step 5 · Let the AI draft fixes

_screen scene · 99s–114s_

Open the Improvements tab. The target run starts on the worst one. Choose how many proposals you want, from one to five, and click Generate suggestions. The local model takes from about half a minute to two minutes.

## 9. Review every draft before you save it

_screen scene · 114s–134s_

Each draft names its target, the changes, the expected impact and the risks. Check the numbers before you save: this one says LT010 goes from two to three, but it actually serves one truck at a time. The tool checks that the places a draft names exist, not its numbers.

## 10. Discuss a proposal

_chat scene · 134s–150s_

Click Discuss on a saved proposal to ask about it. We asked how confident the AI is that it fixes the bottleneck. It answered moderate to high, citing the real queue scores. Remember: it explains, but it hasn't run anything.

## 11. The workflow in six steps

_points scene · 150s–162s_

To recap: open the yard case, compare the runs, find the bottleneck, read the truck timeline, let the AI draft fixes, and discuss them before you decide.

## 12. The AI suggests, you decide

_end scene · 162s–174s_

Once the simulator connection is live, Send to simulator will test a saved proposal for real. Until then, the AI suggests and you decide. Thanks for watching.

