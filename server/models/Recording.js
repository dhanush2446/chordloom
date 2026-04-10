import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for this recording'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: 'Untitled Recording',
    },
    audioData: {
      type: String, // Base64 Data URI matching standard
      required: [true, 'Recording audio data is missing'],
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

const Recording = mongoose.model('Recording', recordingSchema);
export default Recording;
