using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectService.Models;

public class ProjectTask
{
    [Key]
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Status { get; set; } = 0;
    public int Priority { get; set; } = 1;
    public DateTime? Deadline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid ProjectGroupId { get; set; }
    
    public string? AssignedToUserId { get; set; } 

    // Contribution weight calculation
    /// <summary>
    /// Complexity weight 1-5: Higher = more complex task = more contribution
    /// </summary>
    public int ComplexityWeight { get; set; } = 1;
    
    /// <summary>
    /// Estimated hours to complete this task
    /// </summary>
    public double EstimatedHours { get; set; } = 1;

    // Soft delete support
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    public ICollection<TaskSubItem> SubTasks { get; set; } = new List<TaskSubItem>();
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
}


public class TaskSubItem 
{
    [Key]
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsDone { get; set; } = false;
    public Guid ProjectTaskId { get; set; }
    [ForeignKey("ProjectTaskId")]
    public ProjectTask? ProjectTask { get; set; }
}

public class TaskComment
{
    [Key]
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid ProjectTaskId { get; set; }
    [ForeignKey("ProjectTaskId")]
    public ProjectTask? ProjectTask { get; set; }
}
