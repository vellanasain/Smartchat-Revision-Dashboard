import { listRevisionProjects, getRevisionProject, getRevisionProjectCycles } from '../api/revisionProjectsClient';

export async function loadRevisionProjectsTable(filters) {
  const result = await listRevisionProjects(filters);
  return {
    rows: result.items,
    pagination: {
      currentPage: result.current_page,
      perPage: result.per_page,
      total: result.total,
      totalPages: result.total_pages,
    },
  };
}

export async function loadRevisionProjectDetail(projectID) {
  const [project, cycles] = await Promise.all([
    getRevisionProject(projectID),
    getRevisionProjectCycles(projectID),
  ]);
  return { project, cycles: cycles.items || [] };
}
