using System.ComponentModel.DataAnnotations;

namespace ProjectService.Models;

/// <summary>
/// Tracks all important actions in the system for audit purposes
/// </summary>
public class AuditLog
{
    [Key]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Type of action: Create, Update, Delete, StatusChange, etc.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;
    
    /// <summary>
    /// Entity type: ProjectGroup, ProjectTask, Submission, etc.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;
    
    /// <summary>
    /// ID of the affected entity
    /// </summary>
    public Guid EntityId { get; set; }
    
    /// <summary>
    /// ID of the user who performed the action
    /// </summary>
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    /// <summary>
    /// Username or email of the user
    /// </summary>
    [MaxLength(200)]
    public string? UserName { get; set; }
    
    /// <summary>
    /// Old values (JSON) for update operations
    /// </summary>
    public string? OldValues { get; set; }
    
    /// <summary>
    /// New values (JSON) for create/update operations
    /// </summary>
    public string? NewValues { get; set; }
    
    /// <summary>
    /// Additional details about the action
    /// </summary>
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    /// <summary>
    /// IP address of the request
    /// </summary>
    [MaxLength(50)]
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// When the action was performed
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Common action types for audit logging
/// </summary>
public static class AuditAction
{
    public const string Create = "CREATE";
    public const string Update = "UPDATE";
    public const string Delete = "DELETE";
    public const string SoftDelete = "SOFT_DELETE";
    public const string StatusChange = "STATUS_CHANGE";
    public const string AssignMember = "ASSIGN_MEMBER";
    public const string RemoveMember = "REMOVE_MEMBER";
    public const string SubmitWork = "SUBMIT_WORK";
    public const string Grade = "GRADE";
}
