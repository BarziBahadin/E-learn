import SwiftUI
import WidgetKit

private struct LessonProgressEntry: TimelineEntry {
  let date: Date
}

private struct LessonProgressProvider: TimelineProvider {
  func placeholder(in context: Context) -> LessonProgressEntry {
    LessonProgressEntry(date: Date())
  }

  func getSnapshot(
    in context: Context,
    completion: @escaping (LessonProgressEntry) -> Void
  ) {
    completion(LessonProgressEntry(date: Date()))
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<LessonProgressEntry>) -> Void
  ) {
    let entry = LessonProgressEntry(date: Date())
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: entry.date) ?? entry.date
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

private struct LessonProgressWidgetView: View {
  var entry: LessonProgressProvider.Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("E-Lern")
        .font(.headline)
      Text("Continue your next lesson")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(.fill.tertiary, for: .widget)
  }
}

@main
struct LessonProgressWidget: Widget {
  let kind = "LessonProgress"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LessonProgressProvider()) { entry in
      LessonProgressWidgetView(entry: entry)
    }
    .configurationDisplayName("Lesson Progress")
    .description("Quick access to your next E-Lern lesson.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
