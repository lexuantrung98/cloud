using ProjectService.Models;
using ProjectService.Enums;

namespace ProjectService.Services;

public interface IProjectRepository
{
    Task<Guid> CreateTemplateAsync(ProjectTemplate template);
    Task<ProjectTemplate?> GetByIdAsync(Guid id);
    Task UpdateStatusAsync(Guid id, ProjectStatus status);

    Task<Guid> CreateSubmissionAsync(ProjectSubmission submission);
    Task GradeSubmissionAsync(Guid submissionId, double score, string feedback);

    Task<Guid> CreateInstanceAsync(ProjectInstance instance);
    Task<Guid> CreateGroupAsync(ProjectGroup group);
    
    Task<Guid> CreateTaskAsync(ProjectTask task);
    Task UpdateTaskStatusAsync(Guid taskId, int status);
}
