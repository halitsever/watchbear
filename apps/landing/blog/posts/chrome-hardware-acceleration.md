---
title: How to turn hardware acceleration on or off in Chrome
seoTitle: "Chrome Hardware Acceleration: Turn It Off or On"
description: How to turn hardware acceleration off or on in Chrome, where the setting lives now, how to check it in chrome://gpu, and when switching it off helps video.
dek: Chrome renamed the switch, so older guides send you looking for a setting that no longer has that name. Here is where it is today, what it changes, and how to tell whether it is the reason your video stutters.
excerpt: Where the graphics acceleration switch lives in current Chrome, how to read chrome://gpu, and when turning it off is worth a try.
date: 2026-11-28
image: chrome-hardware-acceleration.jpg
imageAlt: Close-up of a GeForce RTX graphics card inside a computer case, lit in warm orange
photo:
  author: Matheus Bertelli
  url: https://www.pexels.com/photo/close-up-of-geforce-rtx-graphics-card-in-pc-34552803/
cta:
  title: Smooth video, then watch it together
  text: Once playback looks right, add the free extension, open the film, and send your friends the invite link.
related:
  - why-watch-party-out-of-sync
  - allow-camera-microphone-chrome
faq:
  - q: How do I turn off hardware acceleration in Chrome?
    a: Open chrome://settings/system, switch off Use graphics acceleration when available, then press Relaunch. The change only takes effect after Chrome restarts.
  - q: Where is the hardware acceleration setting in Chrome?
    a: In Settings, System. Current versions of Chrome call it Use graphics acceleration when available. Older versions and many older guides call it Use hardware acceleration when available.
  - q: Should hardware acceleration be on or off in Chrome?
    a: It is on by default, and for most computers it should stay on, because it lets the graphics chip do drawing and video work. Turn it off only to test whether it causes a specific problem, and turn it back on if it does not help.
  - q: How do I check if hardware acceleration is working in Chrome?
    a: Open chrome://gpu. The Graphics Feature Status list shows each feature, such as Video Decode, as hardware accelerated, software only or disabled.
  - q: Does turning off hardware acceleration make Chrome slower?
    a: It can. With it off, Chrome draws pages and decodes video on the main processor, which works harder and can drain a laptop battery faster. That is why it is best treated as a test, not a permanent setting.
---

Hardware acceleration lets Chrome hand some of its work to your computer's graphics chip instead of doing everything on the main processor. Drawing pages, scrolling, animations, WebGL and decoding video are the jobs that benefit most. It is switched on by default, and most of the time you never think about it.

You notice it when something goes wrong with the picture: a video that flickers, stutters or turns into a black or green box while the sound keeps playing. Switching hardware acceleration off is one of the first things people try in that situation. This guide shows where the switch is in current Chrome, how to check what it is doing, and when changing it is worth it.

## Where the setting is now

Chrome renamed it. The switch that older guides call **Use hardware acceleration when available** is now called **Use graphics acceleration when available**. We checked the name in Chrome 157 on 28 November 2026. It lives in the same place on Windows, Mac and Linux.

### Turn hardware acceleration off

1. Type `chrome://settings/system` in the address bar and press Enter. You can also open the menu with the three dots, choose **Settings**, then **System**.
2. Switch off **Use graphics acceleration when available**.
3. A **Relaunch** button appears next to the switch. Press it. Chrome restarts and reopens your tabs.

The setting does nothing until Chrome restarts, so skipping the relaunch is the usual reason people think the change "didn't work".

### Turn it back on

Same page, same switch: turn it on and press **Relaunch** again.

If the switch is greyed out, Chrome is managed by your workplace or school and the administrator sets it for you.

## Check what Chrome is actually doing

Type `chrome://gpu` in the address bar. The top section, **Graphics Feature Status**, lists each part of Chrome's graphics work with one of three states:

- **Hardware accelerated** means the graphics chip is doing that job.
- **Software only** means the main processor is doing it, either because acceleration is switched off or because Chrome decided not to use the graphics chip on this computer.
- **Disabled** means the feature is off.

For video, look at **Video Decode**. If it says software only while the switch in Settings is on, Chrome has chosen not to use your graphics chip for video, often because of the driver. Updating the graphics driver from your computer maker or the chip maker is then a better next step than toggling Chrome's setting.

You can download the whole page with **Download Report to File** at the top if you are asking someone for help.

## When turning it off is worth a try

Hardware acceleration depends on your graphics driver, and drivers have bugs. Turning it off takes the graphics chip out of the picture, which makes it a quick test for problems like these:

- Video that shows as a black, green or frozen frame while the sound keeps playing.
- Flickering, tearing or garbled blocks on pages or in video.
- Chrome freezing or crashing while a video loads.

If the problem disappears with acceleration off, the cause is somewhere between Chrome and your graphics driver. Update the driver, turn acceleration back on, and test again. Leaving it off for good is a trade: everything still works, but the processor works harder, and a laptop may run warmer and lose battery faster during a long film.

If nothing changes, turn it back on. The problem is somewhere else.

## Try Google's steps too

Google's own help page for [videos that won't play](https://support.google.com/chrome/answer/6138475) doesn't mention this switch. Its steps are:

1. Make sure JavaScript is allowed, because players like YouTube need it.
2. Open the video in an Incognito window. If it works there, an extension or saved site data is the likely cause, so turn extensions off one by one or delete cached images and cookies.
3. Update Chrome.
4. Reset Chrome's settings.
5. Restart your modem and router.

Work through those as well before you decide the graphics chip is to blame.

## Hardware acceleration during a watch party

A watch party asks a lot of one browser tab: a full-length film, plus, if you use it, a video call with your friends. In Watchbear that call runs in Chrome's side panel next to the film, so both share the same computer.

Two things help on an older laptop:

- **Keep acceleration on unless it is causing a visible problem.** Decoding a film on the main processor leaves less room for everything else.
- **Let Watchbear protect the film.** When a computer struggles, Watchbear lowers the picture it sends and can switch your camera off so the film keeps playing. You can turn the camera back on whenever you like.

If one friend's picture stutters but everyone else's is fine, the cause is that friend's computer, not the room. The [out of sync guide](why-watch-party-out-of-sync.html) covers what happens when one player falls behind, and [the side panel guide](chrome-side-panel.html) explains where the chat and video call sit.
