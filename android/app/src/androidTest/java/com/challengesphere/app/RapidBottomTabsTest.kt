package com.challengesphere.app

import android.app.Instrumentation
import android.content.Intent
import android.graphics.Point
import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Configurator
import androidx.test.uiautomator.UiDevice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RapidBottomTabsTest {
  private val targetPackage = "com.challengesphere.app"

  private lateinit var instrumentation: Instrumentation
  private lateinit var device: UiDevice

  private val tabLabels = listOf(
    "Challenges tab",
    "Friends tab",
    "Create tab",
    "Explore tab",
    "Profile tab",
  )

  @Before
  fun launchApp() {
    Configurator.getInstance()
      .setWaitForIdleTimeout(0)
      .setWaitForSelectorTimeout(0)

    instrumentation = InstrumentationRegistry.getInstrumentation()
    device = UiDevice.getInstance(instrumentation)
    device.executeShellCommand("am force-stop $targetPackage")

    val intent = instrumentation.context.packageManager
      .getLaunchIntentForPackage(targetPackage)
      ?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
      ?: error("ChallengeSphere launch intent is unavailable")
    instrumentation.context.startActivity(intent)

    assertTrue(
      "Authenticated bottom tabs did not appear",
      pollUntil(10_000) { tabLabels.all { label -> device.hasObject(By.desc(label)) } },
    )
    assertSelected("Challenges tab", 1_000)
  }

  @Test
  fun unvisitedTabSelectsOnTouchDownAndShowsSkeletonBeforeContent() {
    assertTrue(
      "Create must be unselected before its first visit",
      device.findObject(By.desc("Create tab"))?.isSelected != true,
    )
    assertTrue(
      "Create content must remain lazy before its first visit",
      !device.hasObject(By.text("Step 1 of 4")),
    )

    // Start two other scene reveals and abandon them before choosing Create.
    // This reproduces a user switching while the previous tab is still filling.
    injectTap(centerOf("Friends tab"))
    SystemClock.sleep(35)
    injectTap(centerOf("Explore tab"))
    SystemClock.sleep(35)
    injectTap(centerOf("Challenges tab"))
    assertSelected("Challenges tab", 750)

    val createBounds = device.findObject(By.desc("Create tab")).visibleBounds
    val createCenter = Point(createBounds.centerX(), createBounds.centerY())
    val downTime = injectDown(createCenter)
    var selectedAt: Long? = null
    var skeletonAt: Long? = null
    var contentAt: Long? = null
    var contentSeenBeforeSkeleton = false

    try {
      val observationDeadline = SystemClock.uptimeMillis() + 300
      do {
        if (selectedAt == null && device.findObject(By.desc("Create tab"))?.isSelected == true) {
          selectedAt = SystemClock.uptimeMillis()
        }
        if (skeletonAt == null && device.hasObject(By.desc("Loading Create a challenge"))) {
          skeletonAt = SystemClock.uptimeMillis()
        }
        if (contentAt == null && device.hasObject(By.text("Step 1 of 4"))) {
          contentSeenBeforeSkeleton = skeletonAt == null
          contentAt = SystemClock.uptimeMillis()
        }
        if (selectedAt != null && skeletonAt != null && contentAt != null) break
        SystemClock.sleep(5)
      } while (SystemClock.uptimeMillis() < observationDeadline)

      assertTrue("Create was not selected before ACTION_UP", selectedAt != null)
      assertTrue("Create skeleton was not visible before heavy content", skeletonAt != null)
      assertTrue(
        "Create selection took longer than 250ms after ACTION_DOWN",
        selectedAt != null && selectedAt!! - downTime <= 250,
      )
      assertTrue(
        "Create skeleton took longer than 250ms after ACTION_DOWN",
        skeletonAt != null && skeletonAt!! - downTime <= 250,
      )
      assertTrue(
        "Create skeleton appeared before the tab became selected",
        selectedAt != null && skeletonAt != null && selectedAt!! <= skeletonAt!!,
      )
      assertTrue("Create content was observed before its skeleton", !contentSeenBeforeSkeleton)
      if (contentAt != null) {
        assertTrue("Create content appeared before its skeleton", skeletonAt!! <= contentAt!!)
      }
    } finally {
      injectUp(createCenter, downTime)
    }

    assertSelected("Create tab", 750)
    assertTrue(
      "Create content did not load after its skeleton",
      pollUntil(2_000) { device.hasObject(By.text("Step 1 of 4")) },
    )
  }

  @Test
  fun rapidNonProfileSwitchingKeepsLastTapResponsive() {
    val centers = tabLabels.associateWith { label ->
      val bounds = device.findObject(By.desc(label)).visibleBounds
      Point(bounds.centerX(), bounds.centerY())
    }

    val firstBurst = buildList {
      repeat(10) {
        add("Friends tab")
        add("Challenges tab")
      }
      add("Friends tab")
    }
    injectBurst(firstBurst, centers, 45)
    assertSelected("Friends tab", 1_500)

    val secondBurst = buildList {
      repeat(10) {
        add("Create tab")
        add("Explore tab")
      }
      add("Create tab")
    }
    injectBurst(secondBurst, centers, 60)
    assertSelected("Create tab", 1_500)

    injectTap(centers.getValue("Challenges tab"))
    assertSelected("Challenges tab", 750)
  }

  private fun injectBurst(labels: List<String>, centers: Map<String, Point>, intervalMs: Long) {
    labels.forEach { label ->
      injectTap(centers.getValue(label))
      SystemClock.sleep(intervalMs)
    }
  }

  private fun injectTap(point: Point) {
    val downTime = injectDown(point)
    injectUp(point, downTime)
  }

  private fun centerOf(label: String): Point {
    val bounds = device.findObject(By.desc(label)).visibleBounds
    return Point(bounds.centerX(), bounds.centerY())
  }

  private fun injectDown(point: Point): Long {
    val downTime = SystemClock.uptimeMillis()
    val down = MotionEvent.obtain(
      downTime,
      downTime,
      MotionEvent.ACTION_DOWN,
      point.x.toFloat(),
      point.y.toFloat(),
      0,
    ).apply {
      source = InputDevice.SOURCE_TOUCHSCREEN
    }
    try {
      assertTrue(instrumentation.uiAutomation.injectInputEvent(down, true))
    } finally {
      down.recycle()
    }
    return downTime
  }

  private fun injectUp(point: Point, downTime: Long) {
    val up = MotionEvent.obtain(
      downTime,
      SystemClock.uptimeMillis(),
      MotionEvent.ACTION_UP,
      point.x.toFloat(),
      point.y.toFloat(),
      0,
    ).apply {
      source = InputDevice.SOURCE_TOUCHSCREEN
    }
    try {
      assertTrue(instrumentation.uiAutomation.injectInputEvent(up, true))
    } finally {
      up.recycle()
    }
  }

  private fun assertSelected(expectedLabel: String, timeoutMs: Long) {
    assertTrue(
      "$expectedLabel was not selected within ${timeoutMs}ms",
      pollUntil(timeoutMs) {
        val selected = tabLabels.filter { label ->
          device.findObject(By.desc(label))?.isSelected == true
        }
        selected == listOf(expectedLabel)
      },
    )

    val selected = tabLabels.filter { label ->
      device.findObject(By.desc(label))?.isSelected == true
    }
    assertEquals(listOf(expectedLabel), selected)
  }

  private fun pollUntil(timeoutMs: Long, predicate: () -> Boolean): Boolean {
    val deadline = SystemClock.uptimeMillis() + timeoutMs
    do {
      if (predicate()) return true
      SystemClock.sleep(20)
    } while (SystemClock.uptimeMillis() < deadline)
    return predicate()
  }
}
