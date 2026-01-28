import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  maximumDate,
  minimumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  // Update selectedDate when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    }
  }, [value]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (Platform.OS === 'web') {
    // For web, create a custom date picker with day and year views
    const [showWebPicker, setShowWebPicker] = useState(false);
    const [tempDay, setTempDay] = useState<number>(value ? new Date(value).getDate() : 1);
    const [tempYear, setTempYear] = useState<number>(value ? new Date(value).getFullYear() : new Date().getFullYear());
    const [tempMonth, setTempMonth] = useState<number>(value ? new Date(value).getMonth() : new Date().getMonth());

    // Update temp values when value prop changes
    useEffect(() => {
      if (value) {
        const date = new Date(value);
        setTempDay(date.getDate());
        setTempMonth(date.getMonth());
        setTempYear(date.getFullYear());
      }
    }, [value]);

    const handleWebDateConfirm = () => {
      // Create date with selected day and year, keeping month from original or defaulting to current month
      const newDate = new Date(tempYear, tempMonth, tempDay);
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
      setShowWebPicker(false);
    };

    // Get days in selected month/year
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Generate years (last 19 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 19 }, (_, i) => currentYear - i);

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.inputContainer,
            error && styles.inputContainerError,
            disabled && styles.inputContainerDisabled,
          ]}
          onPress={() => !disabled && setShowWebPicker(true)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={disabled ? Colors.textMuted : Colors.primary}
            style={styles.icon}
          />
          <Text
            style={[
              styles.inputText,
              !value && styles.inputTextPlaceholder,
              disabled && styles.inputTextDisabled,
            ]}
          >
            {value ? formatDisplayDate(value) : 'Select date of birth'}
          </Text>
          <Ionicons
            name="chevron-down-outline"
            size={20}
            color={disabled ? Colors.textMuted : Colors.textLight}
          />
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {showWebPicker && (
          <>
            {Platform.OS === 'web' && (
              <style>{`
                select option {
                  background-color: ${Colors.surface};
                  color: ${Colors.text};
                }
                select option:hover,
                select option:focus,
                select option:checked {
                  background-color: ${Colors.primary} !important;
                  color: ${Colors.textInverse} !important;
                }
                select:focus {
                  border-color: ${Colors.primary} !important;
                  outline: none !important;
                  box-shadow: 0 0 0 2px ${Colors.primary}20 !important;
                }
              `}</style>
            )}
            <Modal
              visible={showWebPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowWebPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.webPickerContainer}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowWebPicker(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={handleWebDateConfirm}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.webPickerContent}>
                  {/* Day Picker */}
                  <View style={styles.webPickerColumn}>
                    <Text style={styles.webPickerLabel}>Day</Text>
                    <select
                      value={tempDay}
                      onChange={(e) => {
                        const newDay = parseInt(e.target.value);
                        setTempDay(newDay);
                      }}
                      style={styles.webSelect}
                      onFocus={(e: any) => {
                        e.target.style.borderColor = Colors.primary;
                        e.target.style.boxShadow = `0 0 0 2px ${Colors.primary}20`;
                      }}
                      onBlur={(e: any) => {
                        e.target.style.borderColor = Colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                      onMouseEnter={(e: any) => {
                        e.target.style.borderColor = Colors.primaryLight;
                      }}
                      onMouseLeave={(e: any) => {
                        if (document.activeElement !== e.target) {
                          e.target.style.borderColor = Colors.border;
                        }
                      }}
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </View>
                  
                  {/* Month Picker (auto-selected, less prominent) */}
                  <View style={[styles.webPickerColumn, { opacity: 0.7 }]}>
                    <Text style={styles.webPickerLabel}>Month</Text>
                    <select
                      value={tempMonth}
                      onChange={(e) => {
                        const newMonth = parseInt(e.target.value);
                        setTempMonth(newMonth);
                        // Adjust day if it's invalid for the new month/year
                        const maxDay = new Date(tempYear, newMonth + 1, 0).getDate();
                        if (tempDay > maxDay) {
                          setTempDay(maxDay);
                        }
                      }}
                      style={{
                        ...styles.webSelect,
                        color: Colors.text,
                        borderColor: Colors.border,
                      }}
                      onFocus={(e: any) => {
                        e.target.style.borderColor = Colors.primary;
                        e.target.style.boxShadow = `0 0 0 2px ${Colors.primary}20`;
                        e.target.style.outline = 'none';
                      }}
                      onBlur={(e: any) => {
                        e.target.style.borderColor = Colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                      onMouseEnter={(e: any) => {
                        if (document.activeElement !== e.target) {
                          e.target.style.borderColor = Colors.primaryLight;
                        }
                      }}
                      onMouseLeave={(e: any) => {
                        if (document.activeElement !== e.target) {
                          e.target.style.borderColor = Colors.border;
                        }
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                        <option key={month} value={month}>
                          {new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </View>
                  
                  {/* Year Picker */}
                  <View style={styles.webPickerColumn}>
                    <Text style={styles.webPickerLabel}>Year</Text>
                    <select
                      value={tempYear}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        setTempYear(newYear);
                        // Adjust day if it's invalid for the new year/month
                        const maxDay = new Date(newYear, tempMonth + 1, 0).getDate();
                        if (tempDay > maxDay) {
                          setTempDay(maxDay);
                        }
                      }}
                      style={{
                        ...styles.webSelect,
                        color: Colors.text,
                        borderColor: Colors.border,
                      }}
                      onFocus={(e: any) => {
                        e.target.style.borderColor = Colors.primary;
                        e.target.style.boxShadow = `0 0 0 2px ${Colors.primary}20`;
                        e.target.style.outline = 'none';
                      }}
                      onBlur={(e: any) => {
                        e.target.style.borderColor = Colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                      onMouseEnter={(e: any) => {
                        if (document.activeElement !== e.target) {
                          e.target.style.borderColor = Colors.primaryLight;
                        }
                      }}
                      onMouseLeave={(e: any) => {
                        if (document.activeElement !== e.target) {
                          e.target.style.borderColor = Colors.border;
                        }
                      }}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={disabled ? Colors.textMuted : Colors.primary}
          style={styles.icon}
        />
        <Text
          style={[
            styles.inputText,
            !value && styles.inputTextPlaceholder,
            disabled && styles.inputTextDisabled,
          ]}
        >
          {value ? formatDisplayDate(value) : 'Select date of birth'}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={20}
          color={disabled ? Colors.textMuted : Colors.textLight}
        />
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {showPicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              visible={showPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      onPress={() => setShowPicker(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Select Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        handleDateChange(null, selectedDate);
                        setShowPicker(false);
                      }}
                      style={styles.doneButton}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={maximumDate}
                    minimumDate={minimumDate}
                    textColor={Colors.primary}
                    accentColor={Colors.primary}
                    themeVariant="light"
                    style={styles.picker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              accentColor={Colors.primary}
              textColor={Colors.text}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  labelError: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.backgroundDark,
    opacity: 0.6,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  inputText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  inputTextPlaceholder: {
    color: Colors.textMuted,
  },
  inputTextDisabled: {
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textLight,
  },
  doneButton: {
    padding: Spacing.xs,
  },
  doneButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  picker: {
    height: 200,
  },
  webPickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: '20%',
  },
  webPickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  webPickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  webPickerLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  webSelect: {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${Colors.border}`,
    borderRadius: BorderRadius.md,
    fontSize: Typography.fontSize.base,
    fontFamily: 'inherit',
    backgroundColor: Colors.surface,
    color: Colors.text,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    // Custom styling for select dropdown
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${encodeURIComponent(Colors.primary)}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '40px',
    // Remove default blue focus outline and use pink
    '&:focus': {
      borderColor: Colors.primary,
      boxShadow: `0 0 0 2px ${Colors.primary}20`,
    },
  },
});

