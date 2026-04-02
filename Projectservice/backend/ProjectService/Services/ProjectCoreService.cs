using ProjectService.DTOs;
using ProjectService.Services;
using ProjectService.Models;
using ProjectService.Enums;

namespace ProjectService.Services;

public class ProjectCoreService
{
    private readonly IProjectRepository _repository;

    public ProjectCoreService(IProjectRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> CreateProjectAsync(CreateProjectDto dto)
    {
        var project = new ProjectTemplate
        {
            SubjectId = dto.SubjectId, 
            Name = dto.Name, 
            Description = dto.Description
        };
        return await _repository.CreateTemplateAsync(project);
    }

    public async Task ApproveProjectAsync(Guid id, bool isApproved)
    {
        var newStatus = isApproved ? ProjectStatus.Approved : ProjectStatus.Rejected;
        await _repository.UpdateStatusAsync(id, newStatus);
    }

    public async Task<Guid> SubmitProjectAsync(object submissionDto) 
    {
        return Guid.NewGuid(); 
    }
    
    public async Task GradeProjectAsync(object gradeDto)
    {
       
    }

    public async Task<Guid> AssignProjectToClassAsync(object dto)
    {
        return Guid.NewGuid(); 
    }

    public async Task<Guid> CreateGroupAsync(object dto)
    {
        return Guid.NewGuid();
    }

    public async Task<Guid> CreateTaskAsync(object dto)
    {
        return Guid.NewGuid();
    }

    public async Task UpdateTaskStatusAsync(object dto)
    {
    }
}
