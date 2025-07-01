import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Dance School CMS')
    .items([
      S.documentTypeListItem('class').title('Dance Classes'),
      S.documentTypeListItem('instructor').title('Instructors'),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !['class', 'instructor'].includes(item.getId()!),
      ),
    ])
