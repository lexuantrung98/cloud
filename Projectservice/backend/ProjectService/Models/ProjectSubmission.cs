using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectService.Models;

public class ProjectSubmission
{
    public Guid Id { get; set; }
    public Guid ProjectGroupId { get; set; } 
    public Guid ProjectMilestoneId { get; set; } 
    public string Content { get; set; } = string.Empty; 
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string? Description { get; set; }

    public double? Grade { get; set; } 
    public string? Feedback { get; set; } 
    public DateTime? GradedAt { get; set; } 

    [ForeignKey("ProjectGroupId")]
    public ProjectGroup? Group { get; set; }
    
    [ForeignKey("ProjectMilestoneId")]
    public ProjectMilestone? ProjectMilestone { get; set; } 
}
