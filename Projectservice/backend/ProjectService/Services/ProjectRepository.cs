using Microsoft.EntityFrameworkCore;
using ProjectService.Services;
using ProjectService.Models;
using ProjectService.Enums;
using ProjectService.Data;

namespace ProjectService.Services;

public class ProjectRepository : IProjectRepository
{
    private readonly ProjectDbContext _context;

    public ProjectRepository(ProjectDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> CreateTemplateAsync(ProjectTemplate template)
    {
        _context.ProjectTemplates.Add(template);
        await _context.SaveChangesAsync();
        return template.Id;
    }

    public async Task<ProjectTemplate?> GetByIdAsync(Guid id)
    {
        return await _context.ProjectTemplates.Include(p => p.Milestones).FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task UpdateStatusAsync(Guid id, ProjectStatus status)
    {
        var template = await _context.ProjectTemplates.FindAsync(id);
        if (template != null)
        {
            template.Status = status;
            if (status == ProjectStatus.Approved) template.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<Guid> CreateSubmissionAsync(ProjectSubmission submission)
    {
        _context.ProjectSubmissions.Add(submission);
        await _context.SaveChangesAsync();
        return submission.Id;
    }

    public async Task GradeSubmissionAsync(Guid submissionId, double grade, string feedback)
    {
        var sub = await _context.ProjectSubmissions.FindAsync(submissionId);
        if (sub != null) 
        { 
            sub.Grade = grade; 
            sub.Feedback = feedback; 
            await _context.SaveChangesAsync(); 
        }
    }

    public async Task<Guid> CreateInstanceAsync(ProjectInstance instance)
    {
        _context.ProjectInstances.Add(instance);
        await _context.SaveChangesAsync();
        return instance.Id;
    }

    public async Task<Guid> CreateGroupAsync(ProjectGroup group)
    {
        _context.ProjectGroups.Add(group);
        await _context.SaveChangesAsync();
        return group.Id;
    }

    public async Task<Guid> CreateTaskAsync(ProjectTask task)
    {
        _context.ProjectTasks.Add(task);
        await _context.SaveChangesAsync();
        return task.Id;
    }

    public async Task UpdateTaskStatusAsync(Guid taskId, int status)
    {
        var task = await _context.ProjectTasks.FindAsync(taskId);
        if (task != null) { 
            await _context.SaveChangesAsync(); 
        }
    }
}
