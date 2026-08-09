import type { ReportDesignId } from "./report-design-types";
import type { ReportDesignImplementation } from "./designs/report-design-component-types";
import { MinistryFormReportDesign } from "./designs/ministry-form";
import { palette as ministryFormPalette } from "./designs/ministry-form/presentation";
import { MinistryFormValueGrid } from "./designs/ministry-form/values";
import { ModernOfficialReportDesign } from "./designs/modern-official";
import { palette as modernOfficialPalette } from "./designs/modern-official/presentation";
import { EvidenceShowcaseReportDesign } from "./designs/evidence-showcase";
import { palette as evidenceShowcasePalette } from "./designs/evidence-showcase/presentation";
import { FormalMemoReportDesign } from "./designs/formal-memo";
import { palette as formalMemoPalette } from "./designs/formal-memo/presentation";
import { CounselingCaseFileReportDesign } from "./designs/counseling-case-file";
import { palette as counselingCaseFilePalette } from "./designs/counseling-case-file/presentation";
import { BehaviorFollowupReportDesign } from "./designs/behavior-followup";
import { palette as behaviorFollowupPalette } from "./designs/behavior-followup/presentation";
import { ProgramImpactReportDesign } from "./designs/program-impact";
import { palette as programImpactPalette } from "./designs/program-impact/presentation";
import { GirlsRoseOfficialReportDesign } from "./designs/girls-rose-official";
import { palette as girlsRoseOfficialPalette } from "./designs/girls-rose-official/presentation";
import { GirlsLilacElegantReportDesign } from "./designs/girls-lilac-elegant";
import { palette as girlsLilacElegantPalette } from "./designs/girls-lilac-elegant/presentation";
import { GirlsPearlCalmReportDesign } from "./designs/girls-pearl-calm";
import { palette as girlsPearlCalmPalette } from "./designs/girls-pearl-calm/presentation";
import { ReportOfficialArchiveDesign } from "./designs/report-official-archive";
import { palette as reportOfficialArchivePalette } from "./designs/report-official-archive/presentation";
import { ReportOfficialArchiveValueGrid } from "./designs/report-official-archive/values";
import { ReportPlayfulCardsDesign } from "./designs/report-playful-cards";
import { palette as reportPlayfulCardsPalette } from "./designs/report-playful-cards/presentation";
import { ReportPlayfulCardsValueGrid } from "./designs/report-playful-cards/values";
import { ReportCalmReaderDesign } from "./designs/report-calm-reader";
import { palette as reportCalmReaderPalette } from "./designs/report-calm-reader/presentation";
import { ReportCalmReaderValueGrid } from "./designs/report-calm-reader/values";
import { MinistryElegantReportDesign } from "./designs/ministry-elegant";
import { palette as ministryElegantPalette } from "./designs/ministry-elegant/presentation";
import { MinistryElegantValueGrid } from "./designs/ministry-elegant/values";
import { MoeOfficial2024ReportDesign } from "./designs/moe-official-2024";
import { palette as moeOfficial2024Palette } from "./designs/moe-official-2024/presentation";
import { getMoeOfficial2024BlockPresentation } from "./designs/moe-official-2024/block-presentation";
import { renderMoeOfficial2024BulletList, renderMoeOfficial2024Narrative } from "./designs/moe-official-2024/blocks";
import { MoeOfficial2024EvidenceRenderer } from "./designs/moe-official-2024/evidence";
import { MoeOfficial2024ReportValueGrid } from "./designs/moe-official-2024/values";
import { MoeClassicFrameReportDesign } from "./designs/moe-classic-frame";
import { palette as moeClassicFramePalette } from "./designs/moe-classic-frame/presentation";
import { MoeClassicFrameValueGrid } from "./designs/moe-classic-frame/values";
import { EditorialAtlasReportDesign } from "./designs/editorial-atlas";
import { palette as editorialAtlasPalette } from "./designs/editorial-atlas/presentation";
import { GeometricHorizonReportDesign } from "./designs/geometric-horizon";
import { palette as geometricHorizonPalette } from "./designs/geometric-horizon/presentation";

export const reportDesignImplementations = {
  "ministry-form": {
    Page: MinistryFormReportDesign,
    palette: ministryFormPalette,
    ValueGrid: MinistryFormValueGrid,
    defaultLogoWidthPx: 132,
    defaultLogoHeightPx: 80,
  },
  "modern-official": { Page: ModernOfficialReportDesign, palette: modernOfficialPalette },
  "evidence-showcase": { Page: EvidenceShowcaseReportDesign, palette: evidenceShowcasePalette },
  "formal-memo": { Page: FormalMemoReportDesign, palette: formalMemoPalette },
  "counseling-case-file": { Page: CounselingCaseFileReportDesign, palette: counselingCaseFilePalette },
  "behavior-followup": { Page: BehaviorFollowupReportDesign, palette: behaviorFollowupPalette },
  "program-impact": { Page: ProgramImpactReportDesign, palette: programImpactPalette },
  "girls-rose-official": { Page: GirlsRoseOfficialReportDesign, palette: girlsRoseOfficialPalette },
  "girls-lilac-elegant": { Page: GirlsLilacElegantReportDesign, palette: girlsLilacElegantPalette },
  "girls-pearl-calm": { Page: GirlsPearlCalmReportDesign, palette: girlsPearlCalmPalette },
  "report-official-archive": { Page: ReportOfficialArchiveDesign, palette: reportOfficialArchivePalette, ValueGrid: ReportOfficialArchiveValueGrid },
  "report-playful-cards": { Page: ReportPlayfulCardsDesign, palette: reportPlayfulCardsPalette, ValueGrid: ReportPlayfulCardsValueGrid },
  "report-calm-reader": { Page: ReportCalmReaderDesign, palette: reportCalmReaderPalette, ValueGrid: ReportCalmReaderValueGrid },
  "ministry-elegant": {
    Page: MinistryElegantReportDesign,
    palette: ministryElegantPalette,
    ValueGrid: MinistryElegantValueGrid,
    defaultLogoWidthPx: 190,
    defaultLogoHeightPx: 102,
  },
  "moe-official-2024": {
    Page: MoeOfficial2024ReportDesign,
    palette: moeOfficial2024Palette,
    getBlockPresentation: getMoeOfficial2024BlockPresentation,
    renderBulletList: renderMoeOfficial2024BulletList,
    renderNarrative: renderMoeOfficial2024Narrative,
    ValueGrid: MoeOfficial2024ReportValueGrid,
    EvidenceRenderer: MoeOfficial2024EvidenceRenderer,
  },
  "moe-classic-frame": {
    Page: MoeClassicFrameReportDesign,
    palette: moeClassicFramePalette,
    ValueGrid: MoeClassicFrameValueGrid,
    defaultLogoWidthPx: 132,
    defaultLogoHeightPx: 80,
  },
  "editorial-atlas": { Page: EditorialAtlasReportDesign, palette: editorialAtlasPalette },
  "geometric-horizon": { Page: GeometricHorizonReportDesign, palette: geometricHorizonPalette },
} satisfies Record<ReportDesignId, ReportDesignImplementation>;

export function getReportDesignImplementation(designId: ReportDesignId): ReportDesignImplementation {
  return reportDesignImplementations[designId];
}
